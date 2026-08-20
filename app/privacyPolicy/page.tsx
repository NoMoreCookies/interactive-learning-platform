import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-xl p-6 md:p-10 space-y-8 text-sm leading-relaxed">
        
        <h1 className="text-2xl md:text-3xl font-bold text-white border-b border-gray-700 pb-4">
          POLITYKA PRYWATNOŚCI I COOKIES PLATFORMY POPROSTUMATMA.PL
        </h1>

        {/* § 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-blue-400">§ 1. Administrator Danych Osobowych</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              Administratorem Twoich danych osobowych jest Kacper Szmigielski, prowadzący działalność nierejestrowaną, adres do korespondencji: [WPISZ SWÓJ ADRES], e-mail: poprostumatma@info.pl.
            </li>
            <li>
              W sprawach związanych z ochroną danych osobowych możesz skontaktować się z Administratorem pod adresem e-mail: poprostumatma@info.pl.
            </li>
          </ol>
        </section>

        {/* § 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-blue-400">§ 2. Cele, podstawy i czas przetwarzania danych</h2>
          <p className="text-gray-300">Twoje dane osobowe przetwarzane są w następujących celach:</p>
          
          <div className="space-y-4 text-gray-300">
            <div>
              <p className="font-bold text-white">1. Utworzenie i obsługa Konta Użytkownika:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-300 mt-1">
                <li>Zakres danych: adres e-mail, imię i nazwisko (jeśli podano), identyfikator Użytkownika.</li>
                <li>Podstawa prawna: niezbędność do wykonania umowy o świadczenie usług drogą elektroniczną (art. 6 ust. 1 lit. b RODO).</li>
                <li>Czas przechowywania: przez okres posiadania aktywnego Konta oraz do czasu przedawnienia roszczeń wynikających z umowy (3 lata od usunięcia Konta).</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white">2. Obsługa Subskrypcji i płatności:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-300 mt-1">
                <li>Zakres danych: historia transakcji, adres e-mail, dane do wystawienia rachunku.</li>
                <li>Podstawa prawna: wykonanie umowy oraz realizacja obowiązków prawno-podatkowych (art. 6 ust. 1 lit. b i c RODO).</li>
                <li>Czas przechowywania: przez okres wymagany przepisami prawa podatkowego (5 lat od końca roku podatkowego).</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white">3. Obsługa reklamacji i kontakt:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-300 mt-1">
                <li>Zakres danych: adres e-mail, treść korespondencji.</li>
                <li>Podstawa prawna: prawnie uzasadniony interes Administratora (art. 6 ust. 1 lit. f RODO).</li>
                <li>Czas przechowywania: do czasu przedawnienia ewentualnych roszczeń (3 lata).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* § 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-blue-400">§ 3. Odbiorcy danych i Profilowanie</h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-300">
            <li>
              Administrator korzysta z usług zewnętrznych dostawców:
              <ul className="list-disc list-inside ml-6 space-y-1 text-gray-300 mt-1">
                <li>Stripe Payments Europe, Ltd. – obsługa płatności automatycznych i kartowych. Administrator nie przechowuje danych kart płatniczych.</li>
                <li>Amazon Web Services (AWS) – przechowywanie danych na serwerach chmurowych, obsługa uwierzytelniania oraz strumieniowanie wideo.</li>
                <li>Dostawcy usług poczty elektronicznej wysyłający wiadomości transakcyjne.</li>
              </ul>
            </li>
            <li>
              Twoje dane osobowe nie będą wykorzystywane do zautomatyzowanego podejmowania decyzji, w tym do profilowania.
            </li>
          </ol>
        </section>

        {/* § 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-blue-400">§ 4. Prawa Użytkownika</h2>
          <p className="text-gray-300">
            Przysługuje Ci prawo do: dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych, wniesienia sprzeciwu oraz wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (PUODO).
          </p>
        </section>

        {/* § 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-blue-400">§ 5. Pliki Cookies</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              Serwis poprostumatma.pl stosuje wyłącznie niezbędne pliki cookies do utrzymania sesji zalogowanego Użytkownika oraz obsługi płatności Stripe.
            </li>
            <li>
              Serwis nie stosuje cookies śledzących ani reklamowych. Użytkownik może w każdej chwili zmienić ustawienia cookies w swojej przeglądarce.
            </li>
          </ol>
        </section>

      </div>
    </div>
  );
};

export default PrivacyPolicy;