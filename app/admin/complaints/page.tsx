"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  adminListComplaints,
  adminResolveComplaint,
  adminInitiateRefund,
  adminReconcileRefund,
  type RefundOperationResult,
  type ComplaintDecision,
  type ComplaintStatus,
  type ComplaintView,
} from "@/lib/services/complaints-service";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: "Oczekujące",
  APPROVED: "Uznane",
  REJECTED: "Odrzucone",
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  INITIATING: "Rozpoczynanie — wymagana weryfikacja",
  AWAITING_RECONCILIATION: "Wysłano żądanie — oczekiwanie na uzgodnienie",
  RECONCILIATION_REQUIRED: "Wymagana ręczna weryfikacja w Stripe",
  SUCCEEDED: "Zakończony pomyślnie (Stripe)",
  FAILED: "Nieudany — sprawdź Stripe",
  CANCELED: "Anulowany — sprawdź Stripe",
  PENDING: "Oczekujący w Stripe",
  REQUIRES_ACTION: "Wymaga dodatkowego działania",
};

function refundStatusLabel(status: string): string {
  return REFUND_STATUS_LABELS[status] ?? `Status techniczny: ${status}`;
}

function dateLabel(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Nieznana data";
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

export default function AdminComplaintsPage() {
  const { isAdmin, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [filter, setFilter] = useState<ComplaintStatus>("SUBMITTED");
  const [items, setItems] = useState<ComplaintView[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<ComplaintDecision | "">("");
  const [decisionReason, setDecisionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refundConfirmationId, setRefundConfirmationId] = useState("");
  const [refundAmountVerified, setRefundAmountVerified] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundBusy, setRefundBusy] = useState<"initiate" | "reconcile" | null>(null);
  const [refundObservations, setRefundObservations] = useState<Record<string, RefundOperationResult>>({});
  const [refundAttempts, setRefundAttempts] = useState<Record<string, true>>({});

  const requestNumberRef = useRef(0);
  const submitInFlightRef = useRef(false);
  // State is not a concurrency primitive; ref blocks rapid double clicks before re-render.
  const refundInFlightRef = useRef(false);
  // One POST attempt per purchase in this mounted page, even if the network result is ambiguous.
  const refundAttemptedSessionsRef = useRef<Set<string>>(new Set());
  const isAuthorized = !authLoading && isAuthenticated && isAdmin;
  const adminUserId = user?.userId ?? null;

  const load = useCallback(async (
    status: ComplaintStatus,
    cursor: string | undefined,
    append: boolean,
    expectedRequestId: number,
  ) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await adminListComplaints(status, cursor);
      if (requestNumberRef.current !== expectedRequestId) return;
      if (append) {
        setItems((existing) => {
          const seen = new Set(existing.map((item) => item.complaintId));
          return [...existing, ...result.items.filter((item) => !seen.has(item.complaintId))];
        });
      } else {
        setItems(result.items);
      }
      setNextToken(result.nextToken);
    } catch {
      if (requestNumberRef.current === expectedRequestId) {
        setError("Nie udało się pobrać kolejki reklamacji. Spróbuj ponownie.");
      }
    } finally {
      if (requestNumberRef.current === expectedRequestId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    const requestId = ++requestNumberRef.current;
    setItems([]);
    setNextToken(null);
    setSelectedId(null);
    setDecision("");
    setDecisionReason("");
    setRefundConfirmationId("");
    setRefundAmountVerified(false);
    setRefundError(null);
    setError(null);
    setSuccess(null);
    setLoading(false);
    setLoadingMore(false);
    if (isAuthorized && adminUserId) {
      void load(filter, undefined, false, requestId);
    }
    // Capture the stable ref object, not its mutable .current value.
    const requestCounter = requestNumberRef;
    return () => { requestCounter.current += 1; };
  }, [isAuthorized, adminUserId, filter, load]);

  function reload() {
    if (!isAuthorized) return;
    const requestId = ++requestNumberRef.current;
    setSelectedId(null);
    setRefundConfirmationId("");
    setRefundAmountVerified(false);
    setRefundError(null);
    void load(filter, undefined, false, requestId);
  }

  function more() {
    if (!isAuthorized || !nextToken || loadingMore || loading) return;
    const requestId = ++requestNumberRef.current;
    void load(filter, nextToken, true, requestId);
  }

  const selected = items.find((item) => item.complaintId === selectedId) ?? null;
  const selectedRefundObservation = selected
    ? refundObservations[selected.stripeCheckoutSessionId] ?? null
    : null;

  async function runRefundAction(action: "initiate" | "reconcile") {
    if (!isAuthorized || refundInFlightRef.current || !selected || selected.status !== "APPROVED") return;
    const complaint = selected;
    const sessionId = complaint.stripeCheckoutSessionId;
    if (action === "initiate") {
      if (refundAttemptedSessionsRef.current.has(sessionId)) {
        setRefundError("Próba zwrotu została już wysłana w tej sesji. Najpierw sprawdź Stripe i BillingRefund.");
        return;
      }
      if (refundConfirmationId !== sessionId || !refundAmountVerified) {
        setRefundError("Sprawdź kwotę zakupu w Stripe TEST, zaznacz potwierdzenie i przepisz pełne ID sesji.");
        return;
      }
      const confirmed = window.confirm(
        "Operacja FINANSOWA: zlecić PEŁNY zwrot dla wskazanego zakupu? " +
        "Po włączeniu REFUND_EXECUTION_ENABLED=true może to natychmiast utworzyć refund w Stripe. " +
        "Nie ponawiaj operacji po błędzie bez sprawdzenia Stripe i BillingRefund.",
      );
      if (!confirmed) return;
    }
    // Reconciliation is read-only in Stripe, but can update BillingRefund/Entitlement.
    if (action === "initiate") {
      refundAttemptedSessionsRef.current.add(sessionId);
      setRefundAttempts((previous) => ({ ...previous, [sessionId]: true }));
    }
    refundInFlightRef.current = true;
    setRefundBusy(action);
    setRefundError(null);
    const requestId = requestNumberRef.current;
    try {
      const result = action === "initiate"
        ? await adminInitiateRefund(complaint.complaintId, sessionId, sessionId)
        : await adminReconcileRefund(sessionId);
      if (requestNumberRef.current !== requestId) return;
      setRefundObservations((previous) => ({ ...previous, [sessionId]: result }));
      setRefundConfirmationId("");
      setRefundAmountVerified(false);
    } catch {
      if (requestNumberRef.current === requestId) {
        setRefundError(action === "initiate"
          ? "Nie potwierdzono wykonania zwrotu. Sprawdź Stripe i BillingRefund; NIE klikaj ponownie bez uzgodnienia. Przy REFUND_EXECUTION_ENABLED=false odmowa jest oczekiwana."
          : "Nie udało się uzgodnić zwrotu. Sprawdź czy istnieje BillingRefund i czy klucz tylko do odczytu ma odpowiednie uprawnienia.");
      }
    } finally {
      refundInFlightRef.current = false;
      setRefundBusy(null);
    }
  }

  async function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (refundInFlightRef.current || submitInFlightRef.current || !isAuthorized || !selected || selected.status !== "SUBMITTED") return;
    const reason = decisionReason.replace(/\r\n?/g, "\n").trim();
    if (!decision || Array.from(reason).length < 10 || Array.from(reason).length > 2000) {
      setDecisionError("Wybierz decyzję i podaj uzasadnienie o długości 10–2000 znaków.");
      return;
    }
    if (!window.confirm(`Potwierdzić decyzję „${decision === "APPROVED" ? "Uznaj" : "Odrzuć"}”? Po zapisaniu nie można jej zmienić w tym panelu.`)) {
      return;
    }
    const complaintId = selected.complaintId;
    const requestId = requestNumberRef.current;
    submitInFlightRef.current = true;
    setSubmitting(true);
    setDecisionError(null);
    setSuccess(null);
    try {
      const result = await adminResolveComplaint(complaintId, decision, reason);
      if (requestNumberRef.current !== requestId) return;
      setSuccess(`Decyzja zapisana: ${result.status === "APPROVED" ? "reklamacja uznana" : "reklamacja odrzucona"}.`);
      setItems((current) => current.filter((item) => item.complaintId !== complaintId));
      setSelectedId(null);
      setDecision("");
      setDecisionReason("");
      // The status index is eventually consistent; refresh to obtain its authoritative current view.
      const refreshRequestId = ++requestNumberRef.current;
      void load(filter, undefined, false, refreshRequestId);
    } catch {
      if (requestNumberRef.current === requestId) {
        setDecisionError("Nie udało się potwierdzić decyzji. Odśwież kolejkę i sprawdź status przed ponowną próbą.");
      }
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return <main className="mx-auto max-w-6xl px-6 py-16 text-zinc-400">Sprawdzanie uprawnień...</main>;
  }
  if (!isAuthorized) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-3xl font-semibold">Brak dostępu</h1>
        <p className="mt-3 text-zinc-400">Ta sekcja wymaga uprawnień administratora.</p>
        <Link href={isAuthenticated ? "/account" : "/auth"} className="mt-5 inline-block text-blue-300 underline">
          {isAuthenticated ? "Wróć do konta" : "Przejdź do logowania"}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header>
        <Link href="/admin" className="text-sm text-blue-300 hover:text-blue-200">← Panel administratora</Link>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Reklamacje klientów</h1>
        <p className="mt-3 text-zinc-400">Przeglądaj zgłoszenia i zapisuj decyzje. Zatwierdzenie reklamacji nie uruchamia zwrotu Stripe.</p>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6" aria-label="Filtr reklamacji">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="complaint-status" className="text-sm font-medium text-zinc-200">Status</label>
          <select id="complaint-status" value={filter} disabled={submitting || refundBusy !== null}
            onChange={(event) => setFilter(event.target.value as ComplaintStatus)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-100">
            {(Object.keys(STATUS_LABELS) as ComplaintStatus[]).map((item) => (
              <option key={item} value={item}>{STATUS_LABELS[item]}</option>
            ))}
          </select>
          <button type="button" disabled={loading || submitting || refundBusy !== null} onClick={reload}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-blue-500 disabled:opacity-50">
            {loading ? "Odświeżanie..." : "Odśwież"}
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">Nowe zgłoszenia mogą pojawić się w indeksie DynamoDB z krótkim opóźnieniem.</p>
      </section>

      {success && <p role="status" className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4 text-sm text-emerald-300">{success}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-800/50 bg-red-950/20 p-4 text-sm text-red-300">{error}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section aria-label="Lista reklamacji" className="space-y-3">
          {loading && items.length === 0 && <p className="text-zinc-400">Pobieranie...</p>}
          {!loading && items.length === 0 && <p className="rounded-xl border border-zinc-800 p-5 text-zinc-400">Brak reklamacji w tej kategorii.</p>}
          {items.map((item) => (
            <button key={item.complaintId} type="button" disabled={refundBusy !== null} onClick={() => { setSelectedId(item.complaintId); setDecision(""); setDecisionReason(""); setDecisionError(null); setRefundError(null); setRefundConfirmationId(""); setRefundAmountVerified(false); }}
              aria-pressed={selectedId === item.complaintId}
              className={`w-full rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${selectedId === item.complaintId ? "border-blue-500 bg-blue-950/20" : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="font-semibold text-zinc-100">{item.subject}</span>
                <span className="text-xs text-zinc-400">{dateLabel(item.createdAt)}</span>
              </div>
              <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm text-zinc-400">{item.description}</p>
              <p className="mt-3 text-xs text-blue-300">{STATUS_LABELS[item.status]}</p>
            </button>
          ))}
          {nextToken && <button type="button" disabled={loadingMore || loading || refundBusy !== null} onClick={more}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:border-blue-500 disabled:opacity-50">
            {loadingMore ? "Wczytywanie..." : "Pokaż więcej"}
          </button>}
        </section>

        <section aria-label="Szczegóły reklamacji" className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          {!selected ? <p className="text-zinc-400">Wybierz reklamację, aby zobaczyć szczegóły i rozpatrzyć zgłoszenie.</p> : (
            <div>
              <h2 className="text-xl font-semibold">{selected.subject}</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div><dt className="text-zinc-500">Zgłoszono</dt><dd>{dateLabel(selected.createdAt)}</dd></div>
                <div><dt className="text-zinc-500">ID zakupu</dt><dd className="break-all font-mono text-xs text-zinc-300">{selected.stripeCheckoutSessionId}</dd></div>
                <div><dt className="text-zinc-500">ID użytkownika</dt><dd className="break-all font-mono text-xs text-zinc-300">{selected.userId}</dd></div>
                <div><dt className="text-zinc-500">Status</dt><dd>{STATUS_LABELS[selected.status]}</dd></div>
              </dl>
              <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200">{selected.description}</p>
              {selected.decisionReason && (
                <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <h3 className="font-medium">Uzasadnienie decyzji</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-300">{selected.decisionReason}</p>
                  {selected.decidedAt && <p className="mt-3 text-xs text-zinc-500">{dateLabel(selected.decidedAt)}</p>}
                </div>
              )}
              {selected.status === "APPROVED" && (
                <section className="mt-7 space-y-4 border-t border-zinc-800 pt-6" aria-label="Obsługa zwrotu">
                  <h3 className="text-lg font-semibold">Zwrot Stripe — operacja ADMIN</h3>
                  <p className="text-sm text-amber-200">
                    Środowisko testowe: sprawdź w Stripe, że to właściwa płatność TEST, jej historyczna kwota i waluta.
                    Ten panel nie odczytuje kwoty zakupu; backend wykonuje wyłącznie pełny zwrot kwoty zapisanej w BillingPurchase.
                  </p>
                  <p className="text-xs text-zinc-400">
                    Status poniżej dotyczy tylko wyniku operacji wykonanej w tej sesji panelu.
                    Nie jest automatycznie pobierany po otwarciu strony.
                  </p>
                  {selectedRefundObservation && (
                    <div role="status" className="rounded-xl border border-blue-800/50 bg-blue-950/20 p-3 text-sm text-blue-200">
                      <p className="font-semibold">Ostatni wynik: {refundStatusLabel(selectedRefundObservation.status)}</p>
                      {selectedRefundObservation.stripeRefundId && (
                        <p className="mt-2 break-all font-mono text-xs">Refund ID: {selectedRefundObservation.stripeRefundId}</p>
                      )}
                      <p className="mt-2 text-xs">Ostateczny status i dostęp Premium zweryfikuj oddzielnie w Stripe i DynamoDB.</p>
                    </div>
                  )}
                  <div>
                    <label htmlFor="refund-confirmation-id" className="mb-2 block text-sm">Aby zlecić zwrot, wpisz pełny identyfikator zakupu</label>
                    <input id="refund-confirmation-id" type="text" autoComplete="off" spellCheck={false}
                      value={refundConfirmationId} disabled={refundBusy !== null}
                      onChange={(event) => setRefundConfirmationId(event.target.value)}
                      placeholder="cs_test_..." className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs" />
                  </div>
                  <label className="flex items-start gap-3 text-sm text-zinc-200">
                    <input type="checkbox" checked={refundAmountVerified} disabled={refundBusy !== null}
                      onChange={(event) => setRefundAmountVerified(event.target.checked)} className="mt-1" />
                    <span>Zweryfikowałem w Stripe TEST tożsamość płatności, historyczną kwotę i walutę.
                      Rozumiem, że kliknięcie może spowodować pełny zwrot, jeśli backend zostanie odblokowany.</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" disabled={refundBusy !== null || !!refundAttempts[selected.stripeCheckoutSessionId] || !!selectedRefundObservation || refundConfirmationId !== selected.stripeCheckoutSessionId || !refundAmountVerified}
                      onClick={() => void runRefundAction("initiate")}
                      className="rounded-xl border border-red-600 bg-red-950/30 px-5 py-3 text-sm font-semibold text-red-100 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50">
                      {refundBusy === "initiate" ? "Wysyłanie..." : "Wykonaj pełny zwrot"}
                    </button>
                    <button type="button" disabled={refundBusy !== null}
                      onClick={() => void runRefundAction("reconcile")}
                      className="rounded-xl border border-blue-700 px-5 py-3 text-sm font-semibold text-blue-200 hover:bg-blue-950/50 disabled:opacity-50">
                      {refundBusy === "reconcile" ? "Uzgadnianie..." : "Uzgodnij status refundu"}
                    </button>
                  </div>
                  {refundError && <p role="alert" className="rounded-xl border border-red-800/50 p-3 text-sm text-red-200">{refundError}</p>}
                  <p className="text-xs text-zinc-500">Po próbie refundu przycisk jest blokowany do przeładowania strony.
                    Nawet po przeładowaniu nie wysyłaj kolejnego żądania bez uzgodnienia stanu w Stripe i BillingRefund.</p>
                </section>
              )}
              {selected.status === "SUBMITTED" && (
                <form onSubmit={(event) => void resolve(event)} className="mt-7 space-y-4 border-t border-zinc-800 pt-6">
                  <h3 className="font-semibold">Rozpatrz reklamację</h3>
                  <div>
                    <label htmlFor="complaint-decision" className="mb-2 block text-sm text-zinc-200">Decyzja</label>
                    <select id="complaint-decision" required value={decision} disabled={submitting}
                      onChange={(event) => setDecision(event.target.value as ComplaintDecision | "")}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3">
                      <option value="">Wybierz decyzję</option>
                      <option value="APPROVED">Uznaj reklamację</option>
                      <option value="REJECTED">Odrzuć reklamację</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="complaint-reason" className="mb-2 block text-sm text-zinc-200">Uzasadnienie (10–2000 znaków)</label>
                    <textarea id="complaint-reason" required rows={5} minLength={10} maxLength={2000}
                      value={decisionReason} disabled={submitting}
                      onChange={(event) => setDecisionReason(event.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3" />
                  </div>
                  {decision === "APPROVED" && <p className="rounded-xl border border-amber-700/40 p-3 text-sm text-amber-200">Uznanie reklamacji nie wykonuje zwrotu pieniędzy. Refund musi zostać zlecony oddzielnie.</p>}
                  {decisionError && <p role="alert" className="text-sm text-red-300">{decisionError}</p>}
                  <button type="submit" disabled={submitting || !decision}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {submitting ? "Zapisywanie..." : "Zapisz decyzję"}
                  </button>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
