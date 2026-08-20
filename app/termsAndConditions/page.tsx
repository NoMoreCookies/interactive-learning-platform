import React from 'react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-xl p-6 md:p-10 space-y-8 text-sm leading-relaxed">
        
        <h1 className="text-3xl font-bold text-white border-b border-gray-700 pb-4">
          Regulamin platformy poprostumatma.pl
        </h1>

        {/* Rozdział I */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-400">Rozdział I – postanowienia ogólne</h2>
          
          <div>
            <h3 className="font-bold text-white">Cel Regulaminu</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>Regulamin określa zasady korzystania z platformy edukacyjnej ,,poprostumatma.pl”</li>
              <li>Regulamin określa prawa i obowiązki Użytkowników oraz Usługodawcy</li>
              <li>Regulamin określa zasady zawierania i wykonywana umów o świadczenie usług drogą elektroniczną.</li>
              <li>Regulamin określa zasady zakupu i korzystania z subskrypcji umożliwiającej dostęp do kursów.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white">Usługodawca</h3>
            <p className="text-gray-300">Kacper Szmigielski</p>
            <p className="text-gray-300">Adres do korespondencji: [WPISZ SWÓJ ADRES ZAMIESZKANIA / KORESPONDENCYJNY, np. ul. Szkolna 5, 00-000 Warszawa]</p>
            <p className="text-gray-300">Adres e-mail: poprostumatma@info.pl</p>
            <p className="text-gray-300 mt-2">
              Usługodawca prowadzi działalność nierejestrowaną w rozumieniu art. 5 ustawy z dnia 6 marca 2018 r. – Prawo przedsiębiorców. W przypadku nadania Usługodawcy numerów NIP lub REGON, dane te zostaną niezwłocznie udostępnione na Platformie. Na żądanie Użytkownika będącego Konsumentem zgłoszone w terminie 3 miesięcy od końca miesiąca, w którym dokonano zakupu, Usługodawca wystawia imienny rachunek.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-white">Podstawy prawne</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>Kodeks cywilny,</li>
              <li>Ustawa z dnia 18 lipca 2002 r. o świadczeniu usług drogą elektroniczną,</li>
              <li>Ustawa z dnia 30 maja 2014 r. o prawach konsumenta,</li>
              <li>Przepisy o ochronie danych osobowych (RODO oraz ustawa o ochronie danych osobowych).</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white">Zakres usług</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>Logowanie/Rejestracja</li>
              <li>Zakup subskrypcji</li>
              <li>Korzystanie z kursów</li>
              <li>Pobieranie materiałów załączonych w lekcjach</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white">Akceptacja regulaminu</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>Korzystanie z platformy oznacza obowiązek przestrzegania regulaminu</li>
              <li>Założenie konta wymaga akceptacji regulaminu platformy</li>
              <li>Zakup subksypcji wymaga wcześniejszego zapoznania się z regulaminem</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white">Podstawy prawne</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>Kodeks cywilny</li>
              <li>Ustawa o świadczeniu usług drogą elektroniczną ustawa o prawach konsumenta</li>
              <li>Przepisy dotyczące ochrony danych osobowych - RODO</li>
            </ul>
          </div>
        </section>

        {/* Rozdział II */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-400">Rozdział II – Definicje</h2>
          <dl className="space-y-3">
            <div>
              <dt className="font-bold text-white">Platforma</dt>
              <dd className="text-gray-300">Serwis internetowy prowadzony pod adresem ,,poprostumatma.pl” wskazany przez Usługodawcę, umożliwiający Użytkownikom korzystnie z usług edukacyjnych, w szczególności z kurów online, materiałów edukacyjnych, oraz funkcjonalności związanych z kontem użytkownika.</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Usługodawca</dt>
              <dd className="text-gray-300">Podmiot świadczący usługi drogą elektroniczną za pośrednictwem Platformy, odpowiedzialny za jej funkcjonowanie, udostępnianie treści edukacyjnych oraz obsługę Użytkownika.</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Użytkownik</dt>
              <dd className="text-gray-300">Osoba fizyczna korzystąca z Platformy, posiadająca Konto, lub korzystająca z dostępnych funkcjonalności</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Konsument</dt>
              <dd className="text-gray-300">Osoba fizyczna dokonująca czynności prawnej z Usługodawcą niezwiązanej bezpośrednio z jej działalnością gospodarczą lub zawodową.</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Konto</dt>
              <dd className="text-gray-300">Indywidualny profil Użytkownika utworzony na Platformie po zakończeniu procesu rejestracji, umożliwiający korzystanie z okreśolnych funkcjonalności, w szczególności dostęp do zakupionych usług</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Dane logowania</dt>
              <dd className="text-gray-300">Informacje umożliwiające dostęp do Konta Użytkownika, w szczególności dostęp do zakupionych usług.</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Kurs</dt>
              <dd className="text-gray-300">Uporządkowany zestaw materiałów edukacyjnych dostępnych na Platformie, obejmujący w szczególności nagrania wideo, materiały tekstowe, zadania, rozwiazania oraz inne treści przygotowane przez Usługodawcę</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Materiały edukacyjne</dt>
              <dd className="text-gray-300">Wszelkie treści udostępnianie Użytkownikowi w ramach Platformy, w szczególności filmy, pliki PDF, notatki, zadania, rozwiązania oraz inne materiały dydaktyczne</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Treści cyfrowe</dt>
              <dd className="text-gray-300">Dane wytwarzanei dsotarczane w postaci cyfrowej, w szczególności materiały edukacyjne dostępne za pośrednictwem platformy</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Subskrypcja</dt>
              <dd className="text-gray-300">Odpłatna usługa zapewniająca Użytkownikowi dostęp do określonych Kursów i Materiałów edukacyjnych przez czas określony okresem rozliczeniowym, zgodnie z wybranym planem płatności.</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Okres rozliczeniowy</dt>
              <dd className="text-gray-300">Okres, za który Użytkownik dokonuje opłaty za Subskrypcję, wynoszący w szczególności jeden miesiąc, chyba że Usługodawca określi inaczej.</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Umowa</dt>
              <dd className="text-gray-300">Umowa o świadczenie usług drogą elektroniczną lub umowa dotycząca dostępu do Treści cyfrowych zawierana pomiędzy Użytkownikiem a Usługodawcą na zasadach określonych w Regulaminie.</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Usługi elektroniczne</dt>
              <dd className="text-gray-300">Usługi świadczone drogą elektroniczną przez Usługodawcę za pośrednictwem Platformy, w szczególności prowadzenie Konta, umożliwienie logowania oraz zapewnienie dostępu do zakupionych Kursów.</dd>
            </div>
            <div>
              <dt className="font-bold text-white">Operator płatności</dt>
              <dd className="text-gray-300">Zewnętrzny dostawca usług płatniczych obsługujący płatności realizowane przez Użytkownika, w szczególności Stripe.</dd>
            </div>
          </dl>
        </section>

        {/* Rozdział III */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-400">Rozdział III – Konto użytkownika</h2>
          
          <div>
            <h3 className="font-bold text-white">1. Rejestracja Konta</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Korzystanie z funkcjonalności Platformy wymagających zalogowania, w szczególności korzystanie z Kursów objętych Subskrypcją, wymaga posiadania aktywnego Konta.</li>
              <li>Rejestracja Konta odbywa się za pośrednictwem formularza dostępnego na Platformie.</li>
              <li>W celu utworzenia Konta Użytkownik podaje dane wymagane przez formularz rejestracyjny, w szczególności adres poczty elektronicznej oraz ustala hasło.</li>
              <li>Użytkownik zobowiązany jest do podawania danych prawdziwych, aktualnych i niewprowadzających w błąd.</li>
              <li>Użytkownik może posiadać jedno Konto, chyba że Usługodawca wyrazi zgodę na utworzenie większej liczby Kont.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">2. Dane logowania i bezpieczeństwo Konta</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Użytkownik zobowiązany jest do zachowania w poufności swoich Danych logowania oraz do nieudostępniania ich osobom trzecim.</li>
              <li>Użytkownik ponosi odpowiedzialność za działania podejmowane z wykorzystaniem jego Konta, z zastrzeżeniem przypadków, w których odpowiedzialność ta nie może zostać na niego nałożona na podstawie obowiązujących przepisów prawa.</li>
              <li>W przypadku podejrzenia, że Dane logowania mogły zostać ujawnione osobie nieuprawnionej, Użytkownik powinien niezwłocznie zmienić hasło oraz poinformować Usługodawcę o zaistniałej sytuacji.</li>
              <li>Użytkownik nie może udostępniać swojego Konta, Danych logowania ani dostępu do zakupionych Kursów innym osobom.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">3. Zasady korzystania z Konta</h3>
            <p className="text-gray-300">Użytkownik zobowiązuje się korzystać z Konta zgodnie z Regulaminem, obowiązującymi przepisami prawa oraz przeznaczeniem Platformy.</p>
            <p className="text-gray-300 mt-1">Zabronione jest w szczególności:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>udostępnianie Konta lub Danych logowania osobom trzecim,</li>
              <li>podejmowanie działań mających na celu uzyskanie nieuprawnionego dostępu do Platformy lub Kont innych Użytkowników,</li>
              <li>obchodzenie lub usuwanie zabezpieczeń technicznych Platformy,</li>
              <li>wykorzystywanie Platformy w sposób mogący zakłócać jej funkcjonowanie,</li>
              <li>podejmowanie działań mających na celu uzyskanie dostępu do Kursów lub Materiałów edukacyjnych bez odpowiedniego uprawnienia.</li>
            </ul>
            <p className="text-gray-300 mt-2">Usługodawca może podejmować działania mające na celu ochronę Platformy, Kont Użytkowników oraz Materiałów edukacyjnych przed nieuprawnionym dostępem lub wykorzystaniem.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">4. Zawieszenie lub ograniczenie Konta</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>W przypadku naruszenia przez Użytkownika postanowień Regulaminu lub obowiązujących przepisów prawa Usługodawca może, w zakresie dopuszczalnym przez obowiązujące przepisy, zawiesić Konto lub ograniczyć dostęp do określonych funkcjonalności Platformy.</li>
              <li>W przypadku naruszeń, które mogą powodować istotne zagrożenie dla bezpieczeństwa Platformy, innych Użytkowników lub praw Usługodawcy, ograniczenie dostępu może nastąpić niezwłocznie.</li>
              <li>Jeżeli charakter naruszenia na to pozwala, Usługodawca może wcześniej wezwać Użytkownika do zaprzestania naruszenia lub jego usunięcia.</li>
              <li>Ograniczenie lub zawieszenie Konta nie wpływa na prawa konsumenta wynikające z bezwzględnie obowiązujących przepisów prawa.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">5. Usunięcie Konta przez Użytkownika</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Użytkownik może w każdym czasie zwrócić się do Usługodawcy z żądaniem usunięcia swojego Konta.</li>
              <li>Usunięcie Konta może skutkować utratą dostępu do funkcjonalności i Materiałów edukacyjnych przypisanych do tego Konta.</li>
              <li>Usunięcie Konta przez Użytkownika nie stanowi podstawy do zwrotu opłat uiszczonych za rozpoczęty Okres rozliczeniowy Subskrypcji, z zastrzeżeniem praw Użytkownika wynikających z bezwzględnie obowiązujących przepisów prawa.</li>
              <li>Jeżeli Użytkownik posiada aktywną Subskrypcję, samo usunięcie Konta nie powinno być traktowane jako skuteczne odstąpienie od umowy lub anulowanie przyszłych płatności, chyba że Usługodawca wyraźnie przewidzi taką możliwość.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">6. Usunięcie Konta przez Usługodawcę</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Usługodawca może usunąć Konto Użytkownika w przypadkach przewidzianych Regulaminem lub obowiązującymi przepisami prawa, w szczególności w przypadku trwałego zakończenia świadczenia usług.</li>
              <li>Usunięcie Konta z przyczyn leżących po stronie Usługodawcy nie narusza praw Użytkownika wynikających z obowiązujących przepisów prawa ani zawartych umów.</li>
              <li>Usługodawca może być zobowiązany do zachowania określonych danych pomimo usunięcia Konta, jeżeli obowiązek taki wynika z przepisów prawa.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">7. Osoby niepełnoletnie</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Z Platformy mogą korzystać osoby małoletnie, na zasadach określonych w Regulaminie oraz obowiązujących przepisach prawa.</li>
              <li>Osoby, które nie ukończyły 18 lat, mogą korzystać z Platformy za zgodą lub pod nadzorem przedstawiciela ustawowego, jeżeli jest to wymagane przez obowiązujące przepisy prawa</li>
              <li>W przypadku zawarcia odpłatnej umowy przez osobę małoletnią zastosowanie mają przepisy dotyczące zdolności do czynności prawnych osób małoletnich.</li>
              <li>Usługodawca może wymagać potwierdzenia zgody przedstawiciela ustawowego w przypadkach, w których jest ona wymagana przez przepisy prawa.</li>
              <li>Jeżeli Subskrypcję nabywa rodzic lub przedstawiciel ustawowy na rzecz osoby małoletniej, osoba ta może korzystać z Platformy w zakresie wynikającym z zakupionej Subskrypcji.</li>
            </ol>
          </div>
        </section>

        {/* Rozdział IV */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-400">Rozdział IV - Subskrypcja i płatności</h2>
          
          <div>
            <h3 className="font-bold text-white">1. Zawarcie umowy dotyczącej Subskrypcji</h3>
            <p className="text-gray-300">W ramach Platformy Użytkownik może wykupić odpłatną Subskrypcję zapewniającą dostęp do Kursów i Materiałów edukacyjnych objętych danym planem Subskrypcji.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">2. Płatności</h3>
            <p className="text-gray-300">Płatności za Subskrypcję są obsługiwane przez zewnętrznego Operatora płatności – Stripe (Stripe Payments Europe, Ltd.).</p>
            <p className="text-gray-300 mt-1">Podanie danych karty płatniczej w procesie zakupu i zatwierdzenie transakcji stanowi wyraźną zgodę Użytkownika na cykliczne i automatyczne obciążanie podanej karty kwotą opłaty subskrypcyjnej za każdy kolejny Okres rozliczeniowy, aż do momentu anulowania Subskrypcji przez Użytkownika.</p>
            <p className="text-gray-300 mt-1">Usługodawca nie przechowuje danych kart płatniczych. Wszelkie operacje płatnicze są szyfrowane i przetwarzane bezpośrednio przez Operatora płatności zgodnie z wymogami bezpieczeństwa PCI-DSS oraz standardami silnego uwierzytelniania klienta (3D Secure).</p>
          </div>

          <div>
            <h3 className="font-bold text-white">3. Automatyczne odnowienie Subskrypcji i ponowne próby płatności</h3>
            <p className="text-gray-300">Subskrypcja odnawia się automatycznie na kolejny miesięczny Okres rozliczeniowy w dacie odpowiadającej dniowi złożenia zamówienia.</p>
            <p className="text-gray-300 mt-1">W przypadku braku możliwości pobrania opłaty subskrypcyjnej za kolejny Okres rozliczeniowy (np. brak środków na karcie, wygaśnięcie karty), Operator płatności (Stripe) może podjąć automatyczne ponowne próby obciążenia karty w odstępach kilku kolejnych dni.</p>
            <p className="text-gray-300 mt-1">Jeżeli ponowne próby pobrania opłaty okażą się bezskuteczne, dostęp do Kursów i Materiałów edukacyjnych w ramach Konta Użytkownika zostaje automatycznie zawieszony lub wyłączony do czasu pomyślnego uregulowania zaległości.</p>
            <p className="text-gray-300 mt-2">Przed dokonaniem zakupu Użytkownik otrzymuje informacje dotyczące w szczególności:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>ceny Subskrypcji,</li>
              <li>długości Okresu rozliczeniowego,</li>
              <li>zasad automatycznego odnowienia Subskrypcji,</li>
              <li>sposobu anulowania Subskrypcji,</li>
              <li>głównych cech świadczenia,</li>
              <li>zasad dotyczących prawa odstąpienia od umowy.</li>
            </ul>
            <p className="text-gray-300 mt-2">Umowa dotycząca Subskrypcji zostaje zawarta z chwilą prawidłowego dokonania płatności i potwierdzenia jej przez Operatora płatności, chyba że przepisy prawa lub warunki wskazane na Platformie stanowią inaczej.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">4. Anulowanie Subskrypcji</h3>
            <p className="text-gray-300">Użytkownik może anulować Subskrypcję za pośrednictwem funkcjonalności dostępnych na Platformie lub w inny sposób wskazany przez Usługodawcę.</p>
            <p className="text-gray-300 mt-1">Użytkownik może zostać poinformowany o nieudanej płatności oraz poproszony o aktualizację danych płatniczych.</p>
            <p className="text-gray-300 mt-1">Jeżeli należna opłata nie zostanie skutecznie pobrana, Usługodawca może ograniczyć lub zawiesić dostęp do Kursów objętych Subskrypcją do czasu uregulowania należności, z uwzględnieniem obowiązujących przepisów prawa.</p>
            <p className="text-gray-300 mt-1">W przypadku trwałego braku płatności Subskrypcja może zostać zakończona.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">5. Zmiana ceny Subskrypcji</h3>
            <p className="text-gray-300">Usługodawca może zmienić cenę Subskrypcji, w szczególności w związku ze zmianą zakresu lub kosztów świadczenia usług, zmianą funkcjonalności Platformy lub zmianą warunków gospodarczych.</p>
            <p className="text-gray-300 mt-1">W przypadku ogłoszenia promocji lub obniżki ceny Subskrypcji, Usługodawca obok informacji o cenie promocyjnej uwidacznia również informację o najniższej cenie danej Subskrypcji, która obowiązywała w okresie 30 dni przed wprowadzeniem obniżki.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">6. Potwierdzenie zakupu</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Po zawarciu Umowy Usługodawca niezwłocznie dostarcza Użytkownikowi potwierdzenie zawarcia Umowy na trwałym nośniku (na podany przez Użytkownika adres e-mail).</li>
              <li>
                Potwierdzenie zawiera w szczególności:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>dane Usługodawcy oraz informacje o zakupionej Subskrypcji,</li>
                  <li>cenę oraz długość Okresu rozliczeniowego,</li>
                  <li>zasady automatycznego odnowienia i sposobu anulowania Subskrypcji,</li>
                  <li>potwierdzenie otrzymania przez Usługodawcę zgody na dostarczenie Treści cyfrowych przed upływem terminu do odstąpienia od umowy oraz przyjęcia przez Konsumenta do wiadomości informacji o utracie prawa do odstąpienia od umowy, informacje dotyczące prawa odstąpienia</li>
                  <li>treść obowiązującego Regulaminu w formacie umożliwiającym jego zapisanie i odtworzenie (np. załącznik PDF lub treść wiadomości e-mail).</li>
                </ul>
              </li>
            </ol>
          </div>
        </section>

        {/* Rozdział V */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-400">Rozdział V – Dostęp do kursów</h2>
          
          <div>
            <h3 className="font-bold text-white">1. Zasady dostępu do kursów</h3>
            <p className="text-gray-300">Wykupienie aktywnej Subskrypcji uprawnia Użytkownika do korzystania z Kursów i Materiałów edukacyjnych objętych wybranym planem Subskrypcji, zgodnie z warunkami określonymi na Platformie.</p>
            <p className="text-gray-300 mt-1">Dostęp do Kursów jest udzielany Użytkownikowi w ramach jego Konta i nie może być przenoszony na inne osoby.</p>
            <p className="text-gray-300 mt-1">Dostęp do Kursów jest przeznaczony wyłącznie do osobistego, niekomercyjnego korzystania przez Użytkownika, chyba że Usługodawca wyraźnie postanowi inaczej.</p>
            <p className="text-gray-300 mt-1">Zakres Kursów dostępnych w ramach Subskrypcji może być określony na Platformie przed dokonaniem zakupu.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">2. Rozpoczęcie i zakończenie dostępu</h3>
            <p className="text-gray-300">Dostęp do Kursów jest aktywowany po prawidłowym dokonaniu płatności i potwierdzeniu jej przez Operatora płatności, chyba że na Platformie wskazano inny termin.</p>
            <p className="text-gray-300 mt-1">Dostęp do Kursów pozostaje aktywny przez okres obowiązywania opłaconej Subskrypcji.</p>
            <p className="text-gray-300 mt-1">W przypadku anulowania automatycznego odnowienia Subskrypcji Użytkownik zachowuje dostęp do Kursów do końca aktualnie opłaconego Okresu rozliczeniowego.</p>
            <p className="text-gray-300 mt-1">Po zakończeniu Subskrypcji dostęp do Kursów objętych Subskrypcją zostaje wyłączony, z zastrzeżeniem praw Użytkownika wynikających z bezwzględnie obowiązujących przepisów prawa.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">3. Zakres i zmiany Kursów</h3>
            <p className="text-gray-300">Usługodawca może rozwijać, aktualizować i modyfikować Kursy, w szczególności poprzez:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>dodawanie nowych Materiałów edukacyjnych,</li>
              <li>aktualizowanie istniejących materiałów,</li>
              <li>poprawianie błędów,</li>
              <li>zmianę sposobu prezentowania treści,</li>
              <li>reorganizację Kursów.</li>
            </ul>
            <p className="text-gray-300 mt-2">Aktualizacja lub zmiana Kursu nie może naruszać praw Użytkownika wynikających z zawartej Umowy ani bezwzględnie obowiązujących przepisów prawa.</p>
            <p className="text-gray-300 mt-1">Usługodawca może wycofać określony Kurs lub jego część z Platformy, jeżeli jest to uzasadnione w szczególności zmianą oferty, koniecznością aktualizacji treści lub względami technicznymi.</p>
            <p className="text-gray-300 mt-1">Jeżeli wycofanie Kursu stanowi istotną zmianę świadczenia w trakcie trwania opłaconego Okresu rozliczeniowego, Usługodawca uwzględni prawa Użytkownika wynikające z obowiązujących przepisów prawa.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">4. Wymagania techniczne, jakość i dostępność Platformy</h3>
            <p className="text-gray-300">Treści cyfrowe udostępniane na Platformie nie wymagają instalowania dodatkowego oprogramowania niestandardowego. Usługodawca nie stosuje technicznych środków ochrony, które uniemożliwiałyby ich odtwarzanie na standardowych urządzeniach spełniających wymogi techniczne (kompatybilność i interoperacyjność).</p>
            <p className="text-gray-300 mt-2">Do korzystania z Platformy, Konta oraz oglądania i pobierania Materiałów edukacyjnych (w tym materiałów wideo) niezbędne jest spełnienie następujących minimalnych wymagań technicznych:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>posiadanie urządzenia końcowego (komputer, tablet, smartfon) z dostępem do sieci Internet</li>
              <li>zainstalowana aktualna wersja przeglądarki internetowej (np. Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge) z włączoną obsługą JavaScript oraz plików cookies</li>
              <li>stabilne połączenie z siecią Internet o przepustowości co najmniej 5 Mbps (zalecana prędkość 10 Mbps lub wyższa dla odtwarzania materiałów wideo w jakości HD</li>
              <li>aktywne konto poczty elektronicznej (e-mail);</li>
            </ul>
            <p className="text-gray-300 mt-2">Materiały edukacyjne w postaci wideo są przesyłane strumieniowo z wykorzystaniem zewnętrznej infrastruktury chmurowej (w szczególności Amazon Web Services - AWS). Usługodawca nie odpowiada za opóźnienia lub ograniczenia płynności odtwarzania wynikające z niewystarczających parametrów łącza internetowego Użytkownika.</p>
            <p className="text-gray-300 mt-1">Usługodawca dokłada należytej staranności w celu zapewnienia prawidłowego funkcjonowania Platformy. Dostęp do Platformy może być jednak czasowo ograniczony z powodu prac konserwacyjnych, aktualizacji technicznych lub awarii infrastruktury zewnętrznej.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">5. Charakter edukacyjny Kursów</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Kursy dostępne na Platformie mają charakter edukacyjny i służą wspieraniu Użytkownika w nauce.</li>
              <li>Usługodawca nie gwarantuje osiągnięcia przez Użytkownika określonego wyniku egzaminu, matury, sprawdzianu lub innego rezultatu edukacyjnego.</li>
              <li>Osiągnięte przez Użytkownika wyniki zależą w szczególności od jego indywidualnego zaangażowania, przygotowania oraz sposobu korzystania z Materiałów edukacyjnych.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">6. Korzystanie z Kursów przez osoby trzecie</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Użytkownik nie może umożliwiać osobom trzecim korzystania z Kursów dostępnych w ramach jego Subskrypcji.</li>
              <li>
                W szczególności zabronione jest:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>przekazywanie danych logowania,</li>
                  <li>udostępnianie Konta,</li>
                  <li>odpłatne lub nieodpłatne udostępnianie dostępu do Kursów,</li>
                  <li>odsprzedaż dostępu do Kursów.</li>
                </ul>
              </li>
              <li>Naruszenie zasad określonych w niniejszym paragrafie może skutkować zastosowaniem środków przewidzianych w Regulaminie, w tym ograniczeniem lub zawieszeniem Konta, z uwzględnieniem obowiązujących przepisów prawa.</li>
            </ol>
          </div>
        </section>

        {/* Rozdział VI */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-400">Rozdział VI - Prawa autorskie i zasady korzystania z Materiałów</h2>
          
          <div>
            <h3 className="font-bold text-white">1. Prawa do Materiałów edukacyjnych</h3>
            <p className="text-gray-300">Materiały edukacyjne dostępne na Platformie, w szczególności nagrania wideo, pliki PDF, notatki, zadania, rozwiązania, grafiki, teksty oraz inne materiały, mogą stanowić utwory chronione przepisami prawa autorskiego.</p>
            <p className="text-gray-300 mt-1">O ile Regulamin lub bezwzględnie obowiązujące przepisy prawa nie stanowią inaczej, prawa autorskie do Materiałów edukacyjnych przysługują Usługodawcy lub innym uprawnionym podmiotom.</p>
            <p className="text-gray-300 mt-1">Wykupienie Subskrypcji nie powoduje przeniesienia na Użytkownika praw autorskich ani innych praw własności intelektualnej do Materiałów edukacyjnych.</p>
            <p className="text-gray-300 mt-1">W ramach Subskrypcji Użytkownik otrzymuje ograniczone, niewyłączne i niezbywalne uprawnienie do korzystania z Materiałów edukacyjnych w zakresie niezbędnym do osobistego korzystania z Kursów.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">2. Dozwolony sposób korzystania z Materiałów</h3>
            <p className="text-gray-300">Użytkownik może korzystać z Materiałów edukacyjnych wyłącznie na własny użytek, w zakresie wynikającym z zawartej Umowy oraz obowiązujących przepisów prawa.</p>
            <p className="text-gray-300 mt-1">Użytkownik może pobierać Materiały edukacyjne przeznaczone przez Usługodawcę do pobrania, jeżeli taka funkcjonalność jest dostępna na Platformie.</p>
            <p className="text-gray-300 mt-1">Materiały pobrane przez Użytkownika mogą być wykorzystywane wyłącznie w zakresie zgodnym z Regulaminem oraz obowiązującymi przepisami prawa.</p>
            <p className="text-gray-300 mt-1">Dostęp do Materiałów edukacyjnych nie oznacza udzielenia Użytkownikowi prawa do ich dalszego rozpowszechniania, sprzedaży, publikowania lub udostępniania osobom trzecim.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">3. Zakazane działania</h3>
            <p className="text-gray-300">Bez zgody Usługodawcy, z zastrzeżeniem uprawnień wynikających z bezwzględnie obowiązujących przepisów prawa, zabronione jest w szczególności:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>kopiowanie lub powielanie Materiałów edukacyjnych poza zakresem dozwolonym przez prawo,</li>
              <li>rozpowszechnianie Materiałów edukacyjnych,</li>
              <li>publikowanie Materiałów edukacyjnych w Internecie lub innych środkach komunikacji,</li>
              <li>sprzedawanie, wynajmowanie lub udostępnianie Materiałów edukacyjnych osobom trzecim,</li>
              <li>udostępnianie Konta lub danych logowania,</li>
              <li>nagrywanie, pobieranie lub utrwalanie nagrań wideo w sposób nieudostępniony przez Platformę,</li>
              <li>obchodzenie zabezpieczeń technicznych stosowanych przez Platformę,</li>
              <li>wykorzystywanie Materiałów edukacyjnych do tworzenia konkurencyjnych kursów, serwisów lub produktów edukacyjnych.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white">4. Wykorzystywanie Materiałów przez systemy sztucznej inteligencji</h3>
            <p className="text-gray-300">Bez uprzedniej pisemnej zgody Usługodawcy zabronione jest wykorzystywanie Materiałów edukacyjnych, w całości lub w części, do trenowania, uczenia, dostrajania, testowania, rozwijania lub ulepszania modeli, systemów lub narzędzi sztucznej inteligencji.</p>
            <p className="text-gray-300 mt-1">Zabronione jest w szczególności przekazywanie Materiałów edukacyjnych lub ich fragmentów do systemów wykorzystujących sztuczną inteligencję w celu ich przetwarzania, analizy, ekstrakcji, tworzenia zbiorów danych lub wykorzystania jako danych treningowych.</p>
            <p className="text-gray-300 mt-2">Zakaz, o którym mowa w niniejszym paragrafie, obejmuje w szczególności:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>nagrania wideo,</li>
              <li>pliki PDF,</li>
              <li>notatki,</li>
              <li>zadania i ich rozwiązania,</li>
              <li>teksty,</li>
              <li>transkrypcje,</li>
              <li>inne Materiały edukacyjne udostępniane za pośrednictwem Platformy.</li>
            </ul>
            <p className="text-gray-300 mt-2">Zabronione jest również automatyczne pobieranie, kopiowanie lub pozyskiwanie Materiałów edukacyjnych w celu ich późniejszego wykorzystania przez systemy sztucznej inteligencji.</p>
            <p className="text-gray-300 mt-1">Postanowienia niniejszego paragrafu nie ograniczają praw Użytkownika, których nie można wyłączyć ani ograniczyć na podstawie bezwzględnie obowiązujących przepisów prawa.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">5. Naruszenie praw do Materiałów</h3>
            <p className="text-gray-300">W przypadku stwierdzenia naruszenia zasad korzystania z Materiałów edukacyjnych Usługodawca może zastosować środki przewidziane w Regulaminie, w szczególności ograniczyć lub zawiesić Konto Użytkownika, z uwzględnieniem obowiązujących przepisów prawa.</p>
            <p className="text-gray-300 mt-1">Jeżeli działanie Użytkownika powoduje szkodę po stronie Usługodawcy lub narusza prawa własności intelektualnej, Usługodawca może dochodzić przysługujących mu roszczeń na zasadach określonych w obowiązujących przepisach prawa.</p>
            <p className="text-gray-300 mt-1">Postanowienia niniejszego rozdziału nie wyłączają ani nie ograniczają uprawnień Użytkownika wynikających z bezwzględnie obowiązujących przepisów prawa.</p>
          </div>
        </section>

        {/* Rozdział VII */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-400">Rozdział VII – Reklamacje</h2>
          
          <div>
            <h3 className="font-bold text-white">1. Prawo do reklamacji</h3>
            <p className="text-gray-300">Usługodawca zobowiązuje się świadczyć usługi zgodnie z zawartą Umową, Regulaminem oraz obowiązującymi przepisami prawa.</p>
            <p className="text-gray-300 mt-1">Użytkownik ma prawo złożyć reklamację w przypadku nieprawidłowego działania Platformy, niedostępności zakupionych Kursów lub innych niezgodności świadczonej usługi z zawartą Umową.</p>
            <p className="text-gray-300 mt-2">Reklamacja może dotyczyć w szczególności:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>braku dostępu do zakupionego Kursu pomimo aktywnej Subskrypcji,</li>
              <li>problemów technicznych uniemożliwiających korzystanie z Platformy,</li>
              <li>nieprawidłowego działania funkcjonalności Platformy,</li>
              <li>niezgodności świadczenia z warunkami przedstawionymi Użytkownikowi przed zakupem.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white">2. Sposób składania reklamacji</h3>
            <p className="text-gray-300">Reklamację można złożyć:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>drogą elektroniczną na adres poczty elektronicznej Usługodawcy wskazany na Platformie, lub</li>
              <li>w inny sposób umożliwiający Usługodawcy zapoznanie się z treścią reklamacji.</li>
            </ul>
            <p className="text-gray-300 mt-2">Reklamacja powinna, w miarę możliwości, zawierać:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>dane umożliwiające identyfikację Użytkownika, w szczególności adres e-mail przypisany do Konta,</li>
              <li>opis problemu lub niezgodności,</li>
              <li>datę wystąpienia problemu, jeżeli jest znana,</li>
              <li>oczekiwany sposób rozwiązania sprawy.</li>
            </ul>
            <p className="text-gray-300 mt-2">Brak któregokolwiek z elementów wskazanych w ust. 2 nie powoduje automatycznego odrzucenia reklamacji, jeżeli na podstawie przekazanych informacji możliwe jest jej rozpatrzenie.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">3. Rozpatrywanie reklamacji</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Usługodawca rozpatruje reklamację w terminie do 14 dni od dnia jej otrzymania.</li>
              <li>O sposobie rozpatrzenia reklamacji Użytkownik zostanie poinformowany na trwałym nośniku (w szczególności w wiadomości e-mail wysłanej na adres przypisany do Konta).</li>
              <li>Jeżeli Usługodawca nie udzieli odpowiedzi na reklamację Konsumenta w terminie 14 dni od dnia jej otrzymania, uważa się, że uznał reklamację w całości.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">4. Niezgodność Treści i Usług cyfrowych z Umową</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Usługodawca ponosi odpowiedzialność za zgodność świadczenia (Usługi cyfrowej polegającej na utrzymaniu Konta oraz Treści cyfrowych w postaci Kursów) z Umową na zasadach określonych w Rozdziale 5b Ustawy o prawach konsumenta.</li>
              <li>
                Treść cyfrowa lub Usługa cyfrowa są zgodne z Umową, jeżeli zgodne z Umową pozostają w szczególności ich:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>opis, rodzaj, ilość, jakość, funkcjonalność, kompatybilność i dostępność,</li>
                  <li>przydatność do szczególnego celu, o którym Konsument powiadomił Usługodawcę najpóźniej w chwili zawarcia Umowy i który Usługodawca zaakceptował.</li>
                </ul>
              </li>
              <li>W przypadku braku zgodności Treści lub Usługi cyfrowej z Umową, Konsument może żądać doprowadzenia do jej zgodności z Umową albo odstąpić od Umowy na warunkach określonych w Ustawie o prawach konsumenta.</li>
              <li>Usługodawca informuje Konsumenta o aktualizacjach (w tym aktualizacjach bezpieczeństwa) niezbędnych do zachowania zgodności Treści lub Usługi cyfrowej z Umową i dostarcza je Konsumentowi przez okres trwania Subskrypcji.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">5. Pozasądowe sposoby rozwiązywania sporów</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Użytkownik będący Konsumentem ma możliwość skorzystania z pozasądowych sposobów rozwiązywania sporów konsumenckich na zasadach określonych w obowiązujących przepisach prawa.</li>
              <li>Szczegółowe informacje dotyczące dostępnych procedur oraz podmiotów uprawnionych do pozasądowego rozwiązywania sporów są dostępne za pośrednictwem właściwych instytucji publicznych.</li>
              <li>Skorzystanie z pozasądowych sposobów rozwiązywania sporów jest dobrowolne, chyba że przepisy prawa stanowią inaczej.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">6. Odpowiedzialność Usługodawcy za zgodność świadczenia z Umową</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Usługodawca ponosi odpowiedzialność za zgodność świadczonych usług oraz dostarczanych Treści cyfrowych z Umową w zakresie określonym obowiązującymi przepisami prawa.</li>
              <li>W przypadku stwierdzenia niezgodności Użytkownik może korzystać z uprawnień przewidzianych w przepisach prawa, w szczególności dotyczących doprowadzenia świadczenia do zgodności z Umową, obniżenia ceny lub rozwiązania Umowy, jeżeli spełnione są ustawowe przesłanki.</li>
              <li>Szczegółowe zasady wykonywania tych uprawnień wynikają z obowiązujących przepisów prawa.</li>
            </ol>
          </div>
        </section>

        {/* Rozdział VIII */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-400">Rozdział VIII – Prawo odstąpienia od umowy</h2>
          
          <p className="text-gray-300 italic">
            Postanowienia dotyczące Konsumenta zawarte w niniejszym Rozdziale stosuje się również do osoby fizycznej zawierającej Umowę bezpośrednio związaną z jej działalnością gospodarczą, gdy z treści tej Umowy wynika, że nie posiada ona dla tej osoby charakteru zawodowego, wynikającego w szczególności z przedmiotu wykonywanej przez nią działalności gospodarczej (na podstawie przepisów o CEIDG).
          </p>

          <div>
            <h3 className="font-bold text-white">1. Prawo odstąpienia od umowy</h3>
            <p className="text-gray-300">Użytkownik będący Konsumentem, a także osoba fizyczna prowadząca działalność gospodarczą zawierająca Umowę bezpośrednio związaną z jej działalnością gospodarczą, ale niemającą dla niej charakteru zawodowego, może w przypadkach przewidzianych przepisami prawa odstąpić od Umowy zawartej na odległość bez podawania przyczyny w terminie 14 dni od dnia jej zawarcia.</p>
            <p className="text-gray-300 mt-1">Do zachowania terminu, o którym mowa w ust. 1, wystarczy wysłanie oświadczenia o odstąpieniu przed upływem 14-dniowego terminu.</p>
            <p className="text-gray-300 mt-1">Oświadczenie o odstąpieniu od Umowy może zostać złożone w szczególności drogą elektroniczną na adres poczty elektronicznej Usługodawcy wskazany na Platformie.</p>
            <p className="text-gray-300 mt-1">Użytkownik może skorzystać z ustawowego formularza odstąpienia od umowy, jednak skorzystanie z formularza nie jest obowiązkowe.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">2. Rozpoczęcie świadczenia przed upływem terminu odstąpienia</h3>
            <p className="text-gray-300">Użytkownik może zażądać rozpoczęcia świadczenia usługi przed upływem 14-dniowego terminu na odstąpienie od Umowy.</p>
            <p className="text-gray-300 mt-1">W przypadku Subskrypcji dostęp do Kursów może zostać udostępniony Użytkownikowi niezwłocznie po zawarciu Umowy i dokonaniu płatności, jeżeli Użytkownik wyraził wymagane prawem żądanie rozpoczęcia świadczenia przed upływem terminu do odstąpienia od Umowy.</p>
            <p className="text-gray-300 mt-1">Użytkownik zostanie poinformowany przed rozpoczęciem świadczenia o skutkach wyrażenia takiego żądania, w zakresie wymaganym przez obowiązujące przepisy prawa.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">3. Treści cyfrowe niedostarczane na nośniku materialnym</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>W przypadku udostępniania Użytkownikowi Treści cyfrowych, które nie są dostarczane na nośniku materialnym, prawo odstąpienia od Umowy może zostać wyłączone w przypadkach przewidzianych przepisami prawa, w szczególności po spełnieniu wymaganych prawem warunków dotyczących rozpoczęcia dostarczania Treści cyfrowych.</li>
              <li>Przed rozpoczęciem dostarczania Treści cyfrowych Użytkownik zostanie poinformowany o zasadach dotyczących prawa odstąpienia od Umowy oraz, jeżeli jest to wymagane, zostanie poproszony o wyrażenie odpowiedniej zgody lub potwierdzenie wymaganych informacji.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">3a. Wyłączenie prawa odstąpienia w przypadku dostarczania Treści cyfrowych</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>a. Zgodnie z art. 38 ust. 1 pkt 13 Ustawy o prawach konsumenta, prawo do odstąpienia od Umowy zawartej na odległość bez podania przyczyny nie przysługuje Konsumentowi, jeżeli spełnianie świadczenia rozpoczęło się za jego wyraźną zgodą przed upływem 14-dniowego terminu do odstąpienia od umowy i po poinformowaniu go przez Usługodawcę o utracie prawa odstąpienia od umowy, a Usługodawca przekazał Konsumentowi potwierdzenie otrzymania tej zgody na trwałym nośniku.</li>
              <li>b. Udzielenie dostępu do Kursów i Treści cyfrowych natychmiast po opłaceniu Subskrypcji następuje na podstawie dobrowolnego i wyraźnego żądania Użytkownika (poprzez zaznaczenie odpowiedniego pola/checkboxa w procesie zakupu).</li>
              <li>c. Z chwilą rozpoczęcia dostarczania Treści cyfrowych (przydzielenia dostępu do materiałów w ramach Konta), pod warunkiem udzielenia zgody oraz przekazania potwierdzenia na trwałym nośniku, prawo do odstąpienia od umowy wygasa.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white">4. Skutki odstąpienia od Umowy</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>W przypadku skutecznego odstąpienia od Umowy Usługodawca zwraca Użytkownikowi dokonane przez niego płatności w zakresie i terminie wynikającym z obowiązujących przepisów prawa.</li>
              <li>Zwrot płatności następuje przy użyciu takiego samego sposobu płatności, jakiego użył Użytkownik przy zawieraniu Umowy, chyba że Użytkownik wyraźnie zgodzi się na inne rozwiązanie lub przepisy prawa stanowią inaczej.</li>
              <li>Jeżeli Użytkownik zażądał rozpoczęcia świadczenia usługi przed upływem terminu do odstąpienia od Umowy, a następnie skutecznie odstąpił od Umowy w okresie, w którym prawo odstąpienia nadal przysługuje, może być zobowiązany do zapłaty kwoty proporcjonalnej do świadczenia spełnionego do chwili odstąpienia, jeżeli obowiązek taki wynika z przepisów prawa.</li>
              <li>Postanowienia niniejszego rozdziału nie ograniczają praw Użytkownika wynikających z bezwzględnie obowiązujących przepisów prawa.</li>
            </ol>
          </div>
        </section>

        {/* Rozdział IX */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-400">Rozdział IX – Odpowiedzialność</h2>
          
          <div>
            <h3 className="font-bold text-white">1. Odpowiedzialność Usługodawcy</h3>
            <p className="text-gray-300">Usługodawca zobowiązuje się do świadczenia usług z należytą starannością oraz zgodnie z obowiązującymi przepisami prawa.</p>
            <p className="text-gray-300 mt-1">Usługodawca odpowiada za niewykonanie lub nienależyte wykonanie usług w zakresie określonym obowiązującymi przepisami prawa.</p>
            <p className="text-gray-300 mt-2">Usługodawca nie ponosi odpowiedzialności za przerwy w dostępie do Platformy wynikające z:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>konieczności przeprowadzenia prac technicznych lub konserwacyjnych,</li>
              <li>awarii infrastruktury technicznej niezależnej od Usługodawcy,</li>
              <li>działania lub zaniechania dostawców usług zewnętrznych,</li>
              <li>okoliczności niezależnych od Usługodawcy, których nie można było racjonalnie przewidzieć lub uniknąć.</li>
            </ul>
            <p className="text-gray-300 mt-2">W przypadku wystąpienia przerwy technicznej Usługodawca podejmuje działania mające na celu możliwie szybkie przywrócenie prawidłowego funkcjonowania Platformy.</p>
            <p className="text-gray-300 mt-1">Postanowienia niniejszego paragrafu nie wyłączają ani nie ograniczają odpowiedzialności Usługodawcy, której nie można wyłączyć lub ograniczyć na podstawie bezwzględnie obowiązujących przepisów prawa.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">2. Odpowiedzialność Użytkownika</h3>
            <p className="text-gray-300">Użytkownik zobowiązany jest korzystać z Platformy zgodnie z Regulaminem, obowiązującymi przepisami prawa oraz jej przeznaczeniem.</p>
            <p className="text-gray-300 mt-1">Użytkownik ponosi odpowiedzialność za działania podejmowane za pośrednictwem jego Konta, z uwzględnieniem przypadków, w których odpowiedzialność ta jest wyłączona na podstawie obowiązujących przepisów prawa.</p>
            <p className="text-gray-300 mt-1">Użytkownik ponosi odpowiedzialność za naruszenie praw Usługodawcy lub osób trzecich wynikające z bezprawnego korzystania z Platformy lub Materiałów edukacyjnych.</p>
            <p className="text-gray-300 mt-1">Użytkownik zobowiązany jest w szczególności do niepodejmowania działań mogących zakłócać funkcjonowanie Platformy, naruszać jej zabezpieczenia lub prowadzić do nieuprawnionego dostępu do danych, Kont lub Materiałów edukacyjnych.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">3. Charakter edukacyjny Platformy</h3>
            <p className="text-gray-300">Materiały edukacyjne dostępne na Platformie mają na celu wspieranie procesu nauki Użytkownika.</p>
            <p className="text-gray-300 mt-1">Usługodawca nie gwarantuje uzyskania przez Użytkownika określonego wyniku egzaminu, matury, sprawdzianu lub innego rezultatu edukacyjnego.</p>
            <p className="text-gray-300 mt-1">Wyniki osiągane przez Użytkownika zależą od wielu czynników, w szczególności od jego indywidualnego zaangażowania, przygotowania oraz sposobu korzystania z Kursów.</p>
            <p className="text-gray-300 mt-1">Postanowienia niniejszego paragrafu nie ograniczają odpowiedzialności Usługodawcy za zgodność świadczonych usług i Treści cyfrowych z Umową.</p>
          </div>
        </section>

        {/* Rozdział X */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-400">Rozdział X – Zmiany Regulaminu</h2>
          
          <div>
            <h3 className="font-bold text-white">1. Zmiana Regulaminu</h3>
            <p className="text-gray-300">Usługodawca może dokonywać zmian Regulaminu wyłącznie z ważnych przyczyn, do których należą:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>zmiana przepisów prawa mająca bezpośredni wpływ na treść Regulaminu lub świadczone Usługi,</li>
              <li>nałożenie określonych obowiązków przez organy państwowe lub sądy,</li>
              <li>zmiana cennika Usług lub zmiana okresów rozliczeniowych,</li>
              <li>zmiana rozwiązań technologicznych lub infrastrukturalnych Platformy.</li>
            </ul>
            <p className="text-gray-300 mt-2">O zmianie Regulaminu Użytkownicy zostaną poinformowani drogą elektroniczną na adres e-mail z co najmniej 14-dniowym wyprzedzeniem.</p>
            <p className="text-gray-300 mt-1">Zmiana Regulaminu w odniesieniu do Użytkowników posiadających aktywną Subskrypcję wchodzi w życie od nowego Okresu rozliczeniowego. Zmiana ceny nie wpływa na Okres rozliczeniowy, za który płatność została już pobrana.</p>
            <p className="text-gray-300 mt-1">Użytkownik, który nie akceptuje nowej treści Regulaminu, ma prawo do anulowania Subskrypcji przed dniem wejścia w życie zmian.</p>
            <p className="text-gray-300 mt-1">Aktualna wersja Regulaminu jest dostępna na Platformie.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">2. Data wejścia w życie zmian</h3>
            <p className="text-gray-300">Regulamin lub jego zmieniona wersja wchodzi w życie w terminie wskazanym przez Usługodawcę, z uwzględnieniem obowiązków wynikających z obowiązujących przepisów prawa.</p>
            <p className="text-gray-300 mt-1">Do Umów zawartych przed wejściem w życie zmian stosuje się zasady wynikające z obowiązujących przepisów prawa oraz odpowiednie postanowienia Regulaminu obowiązującego w chwili zawarcia Umowy, z uwzględnieniem przypadków, w których przepisy prawa dopuszczają zastosowanie zmienionych postanowień.</p>
          </div>
        </section>

        {/* Rozdział XI */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-400">Rozdział XI – Postanowienia końcowe</h2>
          
          <div>
            <h3 className="font-bold text-white">1. Prawo właściwe</h3>
            <p className="text-gray-300">Do Umów zawieranych za pośrednictwem Platformy stosuje się prawo polskie.</p>
            <p className="text-gray-300 mt-1">W przypadku Użytkowników będących Konsumentami lub podmiotami korzystającymi z ochrony przysługującej Konsumentom wybór prawa polskiego nie pozbawia ich ochrony przyznanej im przez bezwzględnie obowiązujące przepisy prawa państwa, w którym mają miejsce zwykłego pobytu, jeżeli przepisy te znajdują zastosowanie.</p>
          </div>

          <div>
            <h3 className="font-bold text-white">2. Kontakt z Usługodawcą</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Kontakt z Usługodawcą jest możliwy w szczególności za pośrednictwem adresu poczty elektronicznej wskazanego na Platformie.</li>
              <li>Dane kontaktowe Usługodawcy są dostępne na Platformie oraz w Polityce prywatności.</li>
              <li>Użytkownik powinien korzystać z aktualnych danych kontaktowych wskazanych na Platformie.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">3. Postanowienia dotyczące Konsumentów</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Postanowienia Regulaminu nie mają na celu wyłączenia ani ograniczenia praw Użytkowników będących Konsumentami lub podmiotami korzystającymi z ochrony przysługującej Konsumentom, wynikających z bezwzględnie obowiązujących przepisów prawa.</li>
              <li>Jeżeli którekolwiek postanowienie Regulaminu okaże się nieważne, bezskuteczne lub niedozwolone w zakresie, w jakim dotyczy Konsumenta, nie wpływa to na ważność pozostałych postanowień Regulaminu.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-white">4. Wejście w życie Regulaminu</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Regulamin wchodzi w życie z dniem wskazanym na Platformie.</li>
              <li>Regulamin jest udostępniany Użytkownikowi nieodpłatnie przed zawarciem Umowy w sposób umożliwiający jego pozyskanie, odtworzenie i utrwalenie.</li>
              <li>Aktualna wersja Regulaminu jest dostępna na Platformie przez cały okres świadczenia usług.</li>
            </ol>
          </div>
        </section>

        {/* Załącznik nr 1 */}
        <section className="space-y-4 border-t border-gray-700 pt-6">
          <h2 className="text-xl font-semibold text-blue-400">ZAŁĄCZNIK NR 1 DO REGULAMINU</h2>
          <h3 className="font-bold text-white uppercase">WZÓR FORMULARZA ODSTĄPIENIA OD UMOWY</h3>
          <p className="text-gray-400 text-xs">(formularz ten należy wypełnić i odesłać tylko w przypadku chęci odstąpienia od umowy, o ile prawo to nie wygasło)</p>

          <div className="bg-gray-900 p-4 rounded border border-gray-700 space-y-2 text-gray-300">
            <p><strong>Adresat:</strong></p>
            <p>Kacper Szmigielski (Po Prostu Matma)</p>
            <p>Adres e-mail: poprostumatma@info.pl</p>
            <p>Adres korespondencyjny: [TWÓJ ADRES KORESPONDENCYJNY]</p>
            <br />
            <p>Ja/My(*) niniejszym informuję/informujemy(*) o moim/naszym odstąpieniu od umowy o świadczenie usługi / dostarczenie treści cyfrowych(*):</p>
            <p className="border-b border-gray-700 py-1">...................................................................................................................................................</p>
            <p>Data zawarcia umowy: ........................................................................................</p>
            <p>Imię i nazwisko konsumenta(-ów): ....................................................................................</p>
            <p>Adres e-mail przypisany do Konta: .....................................................................................</p>
            <br />
            <p>Podpis konsumenta(-ów) (tylko jeżeli formularz jest przesyłany w wersji papierowej):</p>
            <p>Data: .........................................</p>
            <p className="text-xs text-gray-500 mt-2">(*) Niepotrzebne skreślić.</p>
          </div>
        </section>

      </div>
    </div>
  );
};

export default TermsOfService;