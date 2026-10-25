"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  createComplaint,
  getMyComplaints,
  getMyPurchases,
  type ComplaintView,
  type MyPurchase,
} from "@/lib/services/complaints-service";

function dateLabel(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Nieznana data";
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function priceLabel(amountTotal: number, currency: string): string {
  const code = currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return "Kwota niedostępna";
  try {
    return new Intl.NumberFormat("pl-PL", { style: "currency", currency: code }).format(amountTotal / 100);
  } catch {
    return "Kwota niedostępna";
  }
}

function complaintStatusLabel(status: ComplaintView["status"]): string {
  switch (status) {
    case "SUBMITTED": return "Oczekuje na decyzję";
    case "APPROVED": return "Uznana";
    case "REJECTED": return "Odrzucona";
  }
}

function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

function readableError(error: unknown, fallback: string): string {
  // Never render network / AWS internal messages or exception stacks to the user.
  if (error instanceof Error && error.message.startsWith("Nie udało się")) return error.message;
  return fallback;
}

export default function AccountComplaintsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const userId = user?.userId ?? null;
  const activeUserRef = useRef<string | null>(userId);

  const [purchases, setPurchases] = useState<MyPurchase[]>([]);
  const [complaints, setComplaints] = useState<ComplaintView[]>([]);
  const [purchasesToken, setPurchasesToken] = useState<string | null>(null);
  const [complaintsToken, setComplaintsToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMorePurchases, setLoadingMorePurchases] = useState(false);
  const [loadingMoreComplaints, setLoadingMoreComplaints] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [purchaseId, setPurchaseId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Keep the same UUID when retrying the same payload after a network failure.
  const pendingSubmissionRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const submitInFlightRef = useRef(false);

  const refresh = useCallback(async (expectedUserId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [p, c] = await Promise.all([getMyPurchases(), getMyComplaints()]);
      if (activeUserRef.current !== expectedUserId) return;
      setPurchases(p.items);
      setPurchasesToken(p.nextToken);
      setComplaints(c.items);
      setComplaintsToken(c.nextToken);
    } catch {
      if (activeUserRef.current === expectedUserId) {
        setLoadError("Nie udało się pobrać zakupów i reklamacji. Spróbuj ponownie.");
      }
    } finally {
      if (activeUserRef.current === expectedUserId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Synchronize the current identity after commit; never mutate refs during render.
    activeUserRef.current = userId;
    setPurchases([]);
    setComplaints([]);
    setPurchasesToken(null);
    setComplaintsToken(null);
    setPurchaseId("");
    setSubject("");
    setDescription("");
    setLoadError(null);
    setFormError(null);
    setFormSuccess(null);
    pendingSubmissionRef.current = null;
    if (!authLoading && isAuthenticated && userId) {
      void refresh(userId);
    }
  }, [authLoading, isAuthenticated, userId, refresh]);

  async function loadMorePurchases() {
    if (!purchasesToken || loadingMorePurchases || !userId) return;
    const expectedUserId = userId;
    setLoadingMorePurchases(true);
    setLoadError(null);
    try {
      const next = await getMyPurchases(purchasesToken);
      if (activeUserRef.current !== expectedUserId) return;
      setPurchases((current) => {
        const ids = new Set(current.map((item) => item.stripeCheckoutSessionId));
        return [...current, ...next.items.filter((item) => !ids.has(item.stripeCheckoutSessionId))];
      });
      setPurchasesToken(next.nextToken);
    } catch {
      if (activeUserRef.current === expectedUserId) setLoadError("Nie udało się pobrać kolejnych zakupów.");
    } finally {
      if (activeUserRef.current === expectedUserId) setLoadingMorePurchases(false);
    }
  }

  async function loadMoreComplaints() {
    if (!complaintsToken || loadingMoreComplaints || !userId) return;
    const expectedUserId = userId;
    setLoadingMoreComplaints(true);
    setLoadError(null);
    try {
      const next = await getMyComplaints(complaintsToken);
      if (activeUserRef.current !== expectedUserId) return;
      setComplaints((current) => {
        const ids = new Set(current.map((item) => item.complaintId));
        return [...current, ...next.items.filter((item) => !ids.has(item.complaintId))];
      });
      setComplaintsToken(next.nextToken);
    } catch {
      if (activeUserRef.current === expectedUserId) setLoadError("Nie udało się pobrać kolejnych reklamacji.");
    } finally {
      if (activeUserRef.current === expectedUserId) setLoadingMoreComplaints(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitInFlightRef.current || !isAuthenticated || !userId) return;
    setFormError(null);
    setFormSuccess(null);
    const cleanSubject = normalizeText(subject);
    const cleanDescription = normalizeText(description);
    if (!purchases.some((item) => item.stripeCheckoutSessionId === purchaseId)) {
      setFormError("Wybierz zakup ze swojej historii.");
      return;
    }
    if (Array.from(cleanSubject).length < 5 || Array.from(cleanSubject).length > 120 ||
        Array.from(cleanDescription).length < 20 || Array.from(cleanDescription).length > 4000) {
      setFormError("Temat musi mieć 5–120 znaków, a opis 20–4000 znaków.");
      return;
    }

    const fingerprint = JSON.stringify([purchaseId, cleanSubject, cleanDescription]);
    if (!pendingSubmissionRef.current || pendingSubmissionRef.current.fingerprint !== fingerprint) {
      pendingSubmissionRef.current = { fingerprint, id: crypto.randomUUID() };
    }
    const submissionId = pendingSubmissionRef.current.id;
    const expectedUserId = userId;
    submitInFlightRef.current = true;
    setSubmitting(true);
    try {
      const saved = await createComplaint({
        stripeCheckoutSessionId: purchaseId,
        submissionId,
        subject: cleanSubject,
        description: cleanDescription,
      });
      if (activeUserRef.current !== expectedUserId) return;
      // A successful response consumes this idempotency key; a new complaint gets a new UUID.
      pendingSubmissionRef.current = null;
      setPurchaseId("");
      setSubject("");
      setDescription("");
      setFormSuccess(`Reklamacja została przyjęta. Numer: ${saved.complaintId}.`);
      try {
        const result = await getMyComplaints();
        if (activeUserRef.current === expectedUserId) {
          setComplaints(result.items);
          setComplaintsToken(result.nextToken);
        }
      } catch {
        // The complaint is already saved; a read failure must not be shown as a failed submission.
        if (activeUserRef.current === expectedUserId) {
          setLoadError("Zgłoszenie zapisano, ale nie udało się odświeżyć listy. Użyj przycisku Odśwież.");
        }
      }
    } catch (error) {
      if (activeUserRef.current === expectedUserId) {
        setFormError(readableError(error, "Nie udało się potwierdzić wysłania reklamacji. Ponów próbę bez zmiany formularza."));
      }
    } finally {
      submitInFlightRef.current = false;
      if (activeUserRef.current === expectedUserId) setSubmitting(false);
    }
  }

  if (authLoading) {
    return <main className="mx-auto max-w-4xl px-6 py-16 text-zinc-400">Sprawdzanie sesji...</main>;
  }
  if (!isAuthenticated) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-semibold">Zaloguj się, aby przeglądać reklamacje</h1>
        <Link href="/auth" className="mt-6 inline-block text-blue-300 underline">Przejdź do logowania</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-16">
      <header>
        <Link href="/account" className="text-sm text-blue-300 hover:text-blue-200">← Wróć do konta</Link>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Moje reklamacje</h1>
        <p className="mt-3 text-zinc-400">Sprawdź historię zakupów, zgłoś problem i zobacz odpowiedzi administratora.</p>
      </header>

      {loadError && <p role="alert" className="rounded-xl border border-amber-700/40 bg-amber-950/30 p-4 text-sm text-amber-200">{loadError}</p>}
      <div className="flex items-center gap-4">
        <button type="button" disabled={loading || !userId} onClick={() => userId && void refresh(userId)}
          className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-blue-500 disabled:opacity-50">
          {loading ? "Odświeżanie..." : "Odśwież dane"}
        </button>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6" aria-labelledby="new-complaint-title">
        <h2 id="new-complaint-title" className="text-xl font-semibold text-zinc-100">Złóż reklamację dotyczącą zakupu</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Nie podawaj haseł, danych karty ani innych zbędnych danych osobowych. Możesz zgłosić kolejny problem bez miesięcznego limitu.</p>
        {loading && purchases.length === 0 ? <p className="mt-5 text-zinc-400">Pobieranie zakupów...</p> : (
          <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5">
            <div>
              <label htmlFor="complaint-purchase" className="mb-2 block text-sm font-medium text-zinc-200">Zakup</label>
              <select id="complaint-purchase" required disabled={submitting || purchases.length === 0}
                value={purchaseId} onChange={(event) => { setPurchaseId(event.target.value); setFormError(null); }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-zinc-100">
                <option value="">Wybierz zakup</option>
                {purchases.map((purchase) => <option key={purchase.stripeCheckoutSessionId} value={purchase.stripeCheckoutSessionId}>
                  {dateLabel(purchase.paidAt)} — {priceLabel(purchase.amountTotal, purchase.currency)} — {purchase.stripeCheckoutSessionId.slice(-10)}
                </option>)}
              </select>
              {purchasesToken && <button type="button" disabled={loadingMorePurchases} onClick={() => void loadMorePurchases()} className="mt-2 text-sm text-blue-300 underline disabled:opacity-50">
                {loadingMorePurchases ? "Wczytywanie..." : "Pokaż starsze zakupy"}
              </button>}
              {purchases.length === 0 && <p className="mt-2 text-sm text-zinc-400">Nie znaleziono zakupów na tym koncie. Możesz również zgłosić problem sposobem wskazanym w <Link href="/termsAndConditions" className="text-blue-300 underline">regulaminie</Link>.</p>}
            </div>
            <div>
              <label htmlFor="complaint-subject" className="mb-2 block text-sm font-medium text-zinc-200">Temat</label>
              <input id="complaint-subject" required minLength={5} maxLength={120} disabled={submitting}
                value={subject} onChange={(event) => { setSubject(event.target.value); setFormError(null); }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-zinc-100" placeholder="Np. Brak dostępu do lekcji" />
            </div>
            <div>
              <label htmlFor="complaint-description" className="mb-2 block text-sm font-medium text-zinc-200">Opis problemu</label>
              <textarea id="complaint-description" required minLength={20} maxLength={4000} rows={6} disabled={submitting}
                value={description} onChange={(event) => { setDescription(event.target.value); setFormError(null); }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-zinc-100" placeholder="Opisz, na czym polega problem i kiedy wystąpił." />
              <p className="mt-1 text-xs text-zinc-500">{Array.from(description).length}/4000 znaków</p>
            </div>
            {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}
            {formSuccess && <p role="status" className="text-sm text-emerald-300">{formSuccess}</p>}
            <button type="submit" disabled={submitting || purchases.length === 0}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? "Wysyłanie..." : "Wyślij reklamację"}
            </button>
          </form>
        )}
      </section>

      <section aria-labelledby="complaints-history-heading">
        <h2 id="complaints-history-heading" className="text-2xl font-semibold">Historia reklamacji</h2>
        {loading && complaints.length === 0 ? <p className="mt-4 text-zinc-400">Pobieranie reklamacji...</p> :
          complaints.length === 0 ? <p className="mt-4 text-zinc-400">Brak zgłoszeń na tym koncie.</p> : (
            <div className="mt-5 space-y-4">
              {complaints.map((complaint) => (
                <article key={complaint.complaintId} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-zinc-100">{complaint.subject}</h3>
                      <p className="mt-1 text-xs text-zinc-500">Zgłoszono {dateLabel(complaint.createdAt)}</p>
                    </div>
                    <span className="rounded-full border border-blue-500/30 px-3 py-1 text-xs font-semibold text-blue-300">{complaintStatusLabel(complaint.status)}</span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{complaint.description}</p>
                  {complaint.decisionReason && (
                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-sm font-semibold text-zinc-200">Odpowiedź administratora {complaint.decidedAt ? `— ${dateLabel(complaint.decidedAt)}` : ""}</p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-300">{complaint.decisionReason}</p>
                    </div>
                  )}
                  {complaint.status === "APPROVED" && <p className="mt-3 text-xs text-zinc-400">Uznanie reklamacji nie jest potwierdzeniem wykonania zwrotu środków.</p>}
                </article>
              ))}
            </div>
          )}
        {complaintsToken && <button type="button" disabled={loadingMoreComplaints} onClick={() => void loadMoreComplaints()}
          className="mt-5 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-blue-500 disabled:opacity-50">
          {loadingMoreComplaints ? "Wczytywanie..." : "Pokaż starsze reklamacje"}
        </button>}
      </section>
    </main>
  );
}
