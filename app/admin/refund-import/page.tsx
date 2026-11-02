"use client";

import { useState } from "react";
import { adminImportExternalRefund, adminListRefundReviews } from "@/lib/services/complaints-service";

type Review = { eventId: string; stripeRefundId: string; outcome: string };
export default function ExternalRefundImportPage() {
  const [sessionId, setSessionId] = useState("");
  const [refundId, setRefundId] = useState("");
  const [selection, setSelection] = useState<{ session: string; refund: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const load = async (token?: string) => {
    setBusy(true);
    try {
      const page = await adminListRefundReviews(token);
      setReviews(token ? [...reviews, ...page.items] : page.items);
      setNextToken(page.nextToken);
    } catch { setMessage("Nie udało się pobrać kolejki przeglądu."); }
    finally { setBusy(false); }
  };
  const importRefund = async () => {
    if (!selection || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await adminImportExternalRefund(selection.session, selection.refund);
      setMessage(result.status === "SUCCEEDED" ? "Zwrot zaimportowany. Dostęp Premium został przeliczony."
        : result.status === "ALREADY_RECONCILED" ? "Ten zwrot został już uzgodniony. Nie zmieniono ponownie dostępu."
        : `Wymagana ręczna kontrola: ${result.status}. Nie zastosowano zwrotu do dostępu.`);
    } catch { setMessage("Nie potwierdzono wyniku importu. Sprawdź kolejkę i stan zakupu przed kolejną próbą."); }
    finally { setBusy(false); setSelection(null); }
  };
  return <main className="space-y-6">
    <h1 className="text-2xl font-semibold">Import istniejącego zwrotu Stripe</h1>
    <p>Ta operacja nie zleca zwrotu pieniędzy. Uzgadnia istniejący pełny zwrot i przelicza Premium po weryfikacji zakupu w księdze i Stripe.</p>
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault(); setMessage(""); setSelection({ session: sessionId.trim(), refund: refundId.trim() });
    }}>
      <label className="block">Identyfikator istniejącego zakupu (Checkout Session)
        <input className="block w-full rounded border p-2" required maxLength={228} value={sessionId} disabled={busy || !!selection} onChange={(e) => setSessionId(e.target.value)} />
      </label>
      <label className="block">Identyfikator istniejącego zwrotu (re_ lub pyr_)
        <input className="block w-full rounded border p-2" required maxLength={224} value={refundId} disabled={busy || !!selection} onChange={(e) => setRefundId(e.target.value)} />
      </label>
      <button className="rounded border p-2" disabled={busy || !!selection}>Przejdź do potwierdzenia</button>
    </form>
    {selection && <section className="space-y-3 rounded border p-4" aria-label="Potwierdzenie importu">
      <p>Potwierdź uzgodnienie zakupu <strong className="break-all">{selection.session}</strong> ze zwrotem <strong className="break-all">{selection.refund}</strong>. Udany import zmieni dostęp Premium właściciela zakupu.</p>
      <button className="rounded border p-2" disabled={busy} onClick={importRefund}>Potwierdzam import istniejącego zwrotu</button>{" "}
      <button disabled={busy} onClick={() => setSelection(null)}>Anuluj</button>
    </section>}
    {message && <p role="status">{message}</p>}
    <section className="space-y-3">
      <h2 className="text-xl">Przegląd zwrotów i incydentów korelacji</h2>
      <p>Sprawdzaj tę kolejkę regularnie. Nierozwiązane wpisy wymagają kontroli ADMIN. Historia zawiera potwierdzone uzgodnienia. Dane zakupu ustal w zaufanej księdze, nie na podstawie metadanych webhooka.</p>
      <button className="rounded border p-2" disabled={busy} onClick={() => load()}>Odśwież kolejkę</button>
      {[false, true].map((resolved) => <section className="space-y-2" key={String(resolved)}>
        <h3>{resolved ? "Historia uzgodnionych zwrotów" : "Nierozwiązane — wymagają kontroli ADMIN"}</h3>
        <ul className="space-y-2">{reviews.filter((review) => (review.outcome === "ALREADY_RECONCILED") === resolved).map((review) => <li className="break-all rounded border p-3" key={review.eventId}>
          <p>{review.stripeRefundId}: {review.outcome}</p><small>{review.eventId}</small>
        </li>)}</ul>
        <p className="text-sm">{resolved ? "Historia" : "Kolejka"} obejmuje dotychczas pobrane strony.</p>
      </section>)}
      {nextToken && <button disabled={busy} onClick={() => load(nextToken)}>Pokaż kolejne</button>}
    </section>
  </main>;
}
