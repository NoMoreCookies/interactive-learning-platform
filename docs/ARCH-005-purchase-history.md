# ARCH-005 — kompletna historia zakupów przy reconciliation

Status: zmiana lokalna; brak wdrożenia i backfillu. Nie uzyskano dostępu do
AWS/Stripe ani sekretów. Walidacja statyczna nie zastępuje testów integracyjnych.

## Przyczyna i rozwiązanie

GSI `BillingPurchase.userId-index` jest ostatecznie spójny. Obecność
`Entitlement.lastPurchaseId` nie dowodzi obecności wszystkich starszych zakupów.
Reconciler finansowy nie używa już tego indeksu. Indeks pozostaje dla list UI.

Nie powstaje nowa tabela. BillingPurchase zachowuje PK Checkout Session i całą
księgę finansową. Dodane atrybuty to `purchaseHistoryPrevious` (S lub jawne NULL)
i `purchaseHistorySequence` (N, od 1). Entitlement przechowuje
`purchaseHistoryHead` (S lub NULL), `purchaseHistoryCount` (N) oraz
`purchaseHistoryState=VERIFIED_V1` po niezależnym potwierdzeniu kompletności.
Głowa wskazuje ostatni zapisany zakup, również po jego zwrocie; jest niezależna
od `lastPurchaseId`, który nadal oznacza ostatni zakup ocalały w kalkulacji.

Checkout zapisuje odnośnik i numer w istniejącym warunkowym Put zakupu oraz
głowę/licznik w istniejącym Update Entitlement, w tej samej TransactWriteItems co
StripeEvent i CheckoutAttempt. Nie zmienia kluczy idempotencji ani kalkulacji
okresu. Domyślnie nie nadaje znacznika VERIFIED_V1; wyjątek po audytowanym cutoverze opisano niżej. Dla starego rekordu bez atrybutów
zaczyna niezweryfikowany łańcuch nowych zakupów; nie uznaje go za całą historię.
Przy wyłączonej granicy cutoveru pierwszy zakup bez Entitlement pozostaje niezweryfikowany:
brak rekordu nie jest dowodem braku historycznej księgi.

## Gwarancje i limity

Reconciler odczytuje Entitlement i każdy element łańcucha przez GetItem z
ConsistentRead=true. Sprawdza jawne potwierdzenie kompletności, licznik,
malejące numery, koniec NULL, brak cykli/powtórzonych sesji i PaymentIntent,
zgodność userId oraz PK sesji i poprawność identyfikatorów PI. Brak rekordu,
niepełne powiązania lub błędna liczba blokują transakcję. Nie ma Query ani
paginacji GSI; iteracja po odnośnikach musi dojść do potwierdzonego końca.
Porządek obliczania dostępu pozostaje w calculateSurvivingAccess:
grantedFrom, a przy remisie Checkout Session. Kolejność łańcucha go nie zastępuje.

Końcowa transakcja nadal atomowo zapisuje event, refund i Entitlement, sprawdza
wersję Entitlement, a dodatkowo znacznik, głowę i licznik historii. Każdy zakup
i udany refund zwiększa tę samą wersję. Gdy zakup lub inny refund zatwierdzi się
w trakcie odczytów, stary snapshot nie może zostać zatwierdzony; następuje
ponowny odczyt w istniejącej ograniczonej pętli. Jeżeli refund wygra pierwszy,
checkout przelicza nadanie po ponownym odczycie. Zwrócone zakupy pozostają w historii.

Limit wynosi 100 zakupów, także zwróconych. Większa historia blokuje automatyczne
przeliczenie oraz checkout certyfikowanej historii (opis poniżej). Odczyty łańcucha są
sekwencyjne, pozostałe odczyty refundów mają współbieżność do 8. Maksymalnie
5 prób optymistycznych. SEC-002 zachowuje wspólny deadline 22 s i margines 4 s
przed transakcją. Pozostali wywołujący dostają budżet reconciliacji 12 s,
z tym samym marginesem; nie jest to nowy deadline całego handlera. Klient
reconcilera ma jedną próbę SDK, timeout połączenia 1 s i żądania 3 s.
Duża historia/wolne odczyty mogą wymagać późniejszego ponowienia lub obsługi
operacyjnej. Nie skracamy historii, aby zmieścić się w czasie.

AbortError, timeout i utracona odpowiedź nie dowodzą rollbacku. Należy ponowić
te same identyfikatory zakupu/refundu. Rezerwacja importu może być zapisana,
zanim przeliczenie zostanie zablokowane. Nie ma kompensacji ani Stripe POST.

## Wymagany późniejszy rollout i backfill — niewykonane

1. Zaplanować okno serwisowe: wstrzymać wszystkich writerów zakupów, zwrotów
   i Entitlement; uwzględnić kolejki, retry, uruchomione Lambdy i stare wersje.
   Nie certyfikować historii podczas mieszanego wdrożenia. Stary writer nie
   dopisuje odnośników i mógłby naruszyć potwierdzoną kompletność.
2. Wdrożyć wszystkich nowych writerów/reconcilerów w tym kontrolowanym oknie.
   Bez VERIFIED_V1 przeliczenie udanego refundu ma kończyć się błędem,
   bez zmiany dostępu i bez pozornego potwierdzenia eventu.
3. Pozyskać niezależny, kompletny obraz BillingPurchase, np. późniejszy eksport
   PITR w ustalonym punkcie po zatrzymaniu writerów. Nie opierać manifestu na
   GSI ani lastPurchaseId. Repozytorium nie zawiera takiego obrazu ani dowodu
   kompletności. Eksport i narzędzie backfillu wymagają osobnej autoryzacji;
   aplikacja nie dostaje Scan, eksportu ani uprawnień migratora.
4. Sporządzić audytowany manifest wszystkich zakupów każdego użytkownika,
   także zwróconych. Zweryfikować userId, Checkout Session, PaymentIntent,
   CheckoutAttempt/StripeEvent, kwoty/waluty i pola okresów względem księgi.
   Konflikty, brakujące rekordy lub niepewne pochodzenie blokują certyfikację.
   Uporządkować deterministycznie i nadać odnośniki/numerację 1..N; pozostawić
   istniejące dane finansowe i grantedFrom bez zmian. Łańcuch to enumeracja,
   nie nowa reguła obliczania okresów.
5. Przed zmianą istniejącej historii usunąć znacznik kompletności i zwiększyć
   wersję Entitlement warunkowo względem odczytanej wersji. Zapisać wyłącznie
   atrybuty historii zakupów z warunkami zgodności niezmiennych asocjacji.
   Backfill większy od limitu transakcji dzielić na wznawialne partie;
   częściowy backfill nigdy nie otrzymuje znacznika kompletności.
6. Ponownie odczytać cały łańcuch silnie spójnie i porównać każdy element oraz
   liczność z niezależnym manifestem. Dopiero potem warunkowo opublikować
   głowę, licznik i VERIFIED_V1, zwiększając wersję. Wszyscy writerzy nadal
   muszą być zatrzymani. Historia ponad 100 elementów nadal blokuje automat.
7. Zweryfikować kompletność pokrycia manifestu, wznowić wyłącznie nowe wersje
   writerów i ponowić nierozliczone eventy/importy z tymi samymi ID. Bootstrap
   nowych kont wymaga dodatkowej granicy operacyjnej opisanej niżej.

Nie należy wycofywać do starego writera przy pozostawionych VERIFIED_V1.
Najpierw zatrzymać writerów i unieważnić certyfikację ze zmianą wersji.
Nie usuwać Entitlement ani nie modyfikować certyfikowanych odnośników poza
kontrolowaną migracją. Odtworzenie z backupu wymaga spójnego punktu dla tabel
i ponownej weryfikacji. Bez spełnienia tych warunków nie deklarujemy migracji.

## IAM, koszty i późniejsze testy

Webhook, adminReconcileRefund i import tracą Query na userId-index.
Granty BillingPurchase dla webhooka i adminReconcileRefund używają jawnego
ARN tabeli zamiast helpera CDK dodającego index/*. Import już ma jawny ARN.
Dodano read-only GetItem/ConditionCheckItem Entitlement dla preflightu ADMIN; bez nowych usług. Uprawnienia list zakupów pozostają bez zmian.
Migrator nie jest częścią ról aplikacji.

Bez wdrożenia nie ma nowych kosztów AWS. Po wdrożeniu: większe elementy
istniejących tabel (możliwe przekroczenie progów rozliczania zapisów), mocno
spójny odczyt każdego zakupu oraz czas Lambdy. Brak nowej tabeli/indeksu,
brak dodatkowych operacji w transakcji checkoutu. Eksport/backfill i ponowienia
mają osobny koszt; nie określono go bez danych o wolumenie.

Późniejsze testy integracyjne i bezpieczeństwa (NOT RUN): brak starszego zakupu
w GSI przy obecnym lastPurchaseId; poprawny pełny łańcuch; brak znacznika;
częściowy/przerwany backfill; 0/1/100/101 zakupów; brak ogniwa, cykl, zły numer,
inny właściciel/sesja/PI i duplikat PI; zakupy out-of-order i remisy grantedFrom;
dwa checkouty, checkout kontra refund, dwa refundy; ponowny ten sam event;
refund ostatniego i wszystkich zakupów, potem nowy checkout; timeout przed/po
commit i bezpieczny retry; utrata odpowiedzi; wyczerpanie czasu podczas historii;
warunki publikacji znacznika, konflikt wersji migratora i rollback wersji kodu;
kontrola wygenerowanego IAM (bez Query/Scan/index wildcard dla reconcilerów),
odmowa zapisu/eksportu dla nieuprawnionych ról oraz brak Stripe POST.


## Niezależny manifest i granica zaufania

Sam eksport aktualnego BillingPurchase NIE dowodzi kompletności finansowej:
może już zawierać zgodnie skrócony łańcuch. Manifest musi zostać uzgodniony
z niezależną historią opłaconych sesji i PaymentIntent Stripe, zwrotów, prób
checkoutu oraz zachowanych zdarzeń/księgowości. Rozliczyć wszystkie rozbieżności,
także płatność bez rekordu, zakup bez zdarzenia i różne konta Stripe/TEST/LIVE.
Każdy manifest zawiera środowisko, konto Stripe, zakres czasu i watermark,
identyfikatory właściciela/sesji/PI, kwotę, walutę, daty, granty, stan refundu,
źródła dowodów, hash pliku i akceptację niezależnego recenzenta. Zachować go
poza rolami writerów aplikacji wraz z raportem porównania i ticketem migracji.
Nie odtwarzać grantów na podstawie domysłu; brak dowodu blokuje certyfikację.
Niniejsza zmiana nie pobiera manifestu ani nie wykonuje backfillu.

Immutability aplikacji NIE chroni przed administratorem AWS z PutItem,
UpdateItem, DeleteItem, zmianą roli, tabeli, backupu lub kodu. Taki principal
może podmienić kwoty, PI albo cały spójny łańcuch wraz z VERIFIED_V1. Walidator
wykrywa błędy struktury/formatu/asocjacji, ale nie potwierdza każdego poprawnie
sformatowanego PI w Stripe przy każdym odczycie. To jawna granica zaufania.
Wymagane operacyjnie: ograniczony break-glass i migrator, niezależna autoryzacja,
audyt zmian i okresowe uzgodnienie z manifestem. To nie jest kryptograficzna
księga odporna na administratora AWS. Po podejrzeniu manipulacji zatrzymać
writerów i bootstrap, unieważnić certyfikację warunkowo ze zmianą wersji;
nie wykonywać automatycznej naprawy ani opierać się na GSI.

## Bootstrap po cutoverze — domyślnie zamknięty

`PURCHASE_HISTORY_CUTOVER_ID` jest pusty domyślnie. Nie włączono go w tej zmianie.
Wartość jest identyfikatorem zatwierdzonego dowodu operacyjnego, nie dowodem sama
w sobie. Włączenie wymaga WSZYSTKICH poniższych warunków:

1. Wstrzymać rejestrację, checkout i wszystkich writerów; odczekać uruchomione
   żądania, retry, stare wersje i zdarzenia. Sporządzić kompletny inventory Cognito
   (także niepotwierdzone konta), kont usuniętych z historią oraz właścicieli
   wszystkich prób checkoutu i sesji Stripe. Uwzględnić otwarte/pending sesje,
   opóźnione płatności i webhooki. Nie wystarczy inventory samych Entitlement.
2. KAŻDY istniejący userId i właściciel starej sesji musi mieć trwały anchor
   Entitlement. Istniejący poprawny rekord zachować. Brakujący utworzyć warunkowo
   z version=1, productCode=PREMIUM, accessUntil w przeszłości, head=NULL,
   count=0 i BEZ VERIFIED_V1, dopóki manifest nie dowiedzie kompletności.
   To blokada legacy, nie twierdzenie o zerowej liczbie zakupów. Nie nadpisywać
   istniejących grantów ani maskować brakujących danych przez pustą certyfikację.
3. Dla potwierdzonego pustego manifestu można osobno certyfikować count=0;
   pozostali legacy pozostają niezweryfikowani albo przechodzą opisany backfill.
   Niezależny recenzent potwierdza pełne pokrycie inventory, również pending.
4. W tym samym oknie wdrożyć wszystkich writerów z zatwierdzonym ID cutoveru,
   zachować dowody i dopiero potem wznowić rejestrację/checkout. Utrzymywać zakaz
   usuwania anchorów i odtwarzania starych tożsamości bez ich anchorów.

Dopiero przy tym invariantcie brak Entitlement oznacza nową tożsamość spoza
legacy inventory. Pierwszy opłacony checkout zapisuje VERIFIED_V1 oraz
purchaseHistoryCutoverId atomowo z pierwszym zakupem pod warunkiem
attribute_not_exists(userId). Dwa pierwsze checkouty konkurują o ten sam rekord;
przegrany ponownie odczytuje wersję i dopisuje zakup. Legacy i stare sesje zawsze
trafiają na zachowany anchor i NIE uzyskują certyfikacji przez checkout. Ambiguous
inventory blokuje włączenie konfiguracji; nie używamy czasu nadejścia webhooka
jako czasu powstania konta. Nie uruchamiać cutoveru, jeżeli nie można dowieść
pokrycia wszystkich historycznych identyfikatorów. Zmiana konta/środowiska,
restore lub utrata anchorów unieważnia ten invariant: wyłączyć bootstrap,
zatrzymać writerów i ponownie uzgodnić dane. Wyłączenie flagi nie cofa już
nadanych certyfikatów; wymagają osobnego audytu i ewentualnej invalidacji.

## Preflight, współbieżność i fail closed

adminInitiateRefund zachowuje ADMIN, APPROVED, circuit breaker, tryb Stripe,
rezerwację i idempotency key. Przed rezerwacją i Stripe POST odczytuje cały
VERIFIED_V1 łańcuch (limit 100, deadline 6 s) i waliduje granty wszystkich
rekordów, również zwracanych. Rezerwacja zawiera ConditionCheck wersji oraz
VERIFIED_V1 na Entitlement; konflikt nie wysyła POST. Pozostaje budżet na POST
z timeoutem 4 s. Rezerwacja zaczyna w NOT_STARTED; ponowne zatwierdzenie ADMIN
może ją warunkowo przejąć po pełnym preflightcie. Po rozpoczęciu POST nie ma
automatycznego ponowienia; szczegóły stanów i budżetów poniżej. Późniejszy webhook
ponownie weryfikuje historię i atomowo aktualizuje wersję. Rezerwacja nie blokuje
późniejszych legalnych checkoutów. Uprzywilejowana manipulacja po preflightcie
pozostaje w opisanej granicy zaufania i może wymagać incydentu po refundzie.

Checkout certyfikowanej historii również sprawdza ją przed kalkulacją grantu;
zmiana odczytanej wersji powoduje ponowną próbę, a commit nadal sprawdza wersję.
Historie >100 blokują taki checkout oraz refund; wymagają osobnej procedury,
nie wolno przycinać listy. Legacy pozostają niezweryfikowane: dotychczasowe
nadanie po checkout działa, ale automatyczne przeliczenie refundu jest zablokowane.
Fail closed reconciliation oznacza brak nowej kalkulacji i commitu; sam błąd nie
cofa istniejącego dostępu. Incydent wymagający zawieszenia dostępu ma odrębną
procedurę operacyjną. SEC-002 Dashboard import i SEC-001 MFA pozostają zachowane.

## IAM i backup — gwarancje infrastruktury

Cztery tabele finansowe mają PITR=true i jawne RemovalPolicy.RETAIN.
Nie osłabiono backupu. RETAIN zachowuje tabelę przy usunięciu/zastąpieniu przez
CloudFormation; nie zapobiega DeleteTable przez uprawnionego administratora.
Stan rzeczywiście wdrożonych zasobów i efektywnego IAM wymaga późniejszej kontroli.

Webhook: Purchase Get/Put; Refund Get/Update; Entitlement Get/Update; Event Get/Put.
Checkout Lambda nie zapisuje tych tabel finansowych; zapisuje próby checkoutu.
ADMIN initiate: Purchase Get/ConditionCheck; Refund Get/Put/Update; Entitlement
Get/ConditionCheck; bez zapisu Event/Entitlement. ADMIN reconcile: Purchase Get,
Refund Get/Update, Entitlement Get/Update, Event Put. SEC-002 import: dotychczasowe
Get/ConditionCheck Purchase, Get/Put/Update Refund, Get/Update Entitlement,
Get/Put Event. ADMIN Cognito nie oznacza bezpośredniego administratora DynamoDB.

Wszystkie granty czterech tabel używają dokładnego ARN tabeli zamiast helpera
rozszerzającego zakres na index/*. Query list UI i review pozostają na nazwanych
indeksach. Nie dodano DeleteItem, Scan, wildcard ani samodzielnego uprawnienia
TransactWriteItems. Transakcje są autoryzowane przez operacje PutItem, UpdateItem
i ConditionCheckItem zgodnie z [dokumentacją AWS](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis-iam.html).
Syntetyzowany/effective IAM, permissions boundaries i polityki organizacji nie
zostały sprawdzone przez AWS; to warunek odbioru wdrożenia.

## Runbook odtworzenia pojedynczego zakupu — NIE WYKONANO

1. Otworzyć incydent; zatrzymać refundy, checkout i migrator dla objętych danych,
   wyłączyć bootstrap i zabezpieczyć surowe aktualne rekordy, wersje, manifesty,
   identyfikatory zdarzeń, ślady zmian oraz przyczynę i czas uszkodzenia.
2. Przy osobnej autoryzacji odtworzyć PITR do NOWEJ izolowanej tabeli z punktu
   sprzed uszkodzenia. PITR ma ograniczone okno, domyślnie do 35 dni; nie chroni
   przed korupcją starszą od dostępnego punktu. Nie przełączać aplikacji na
   starą tabelę i nie zastępować produkcyjnej tabeli snapshotem.
   [AWS PITR](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html).
3. Niezależny recenzent porównuje kandydat z manifestem, potwierdzoną płatnością
   Stripe, CheckoutAttempt/Event, stanem refundów i obecnym otoczeniem łańcucha.
   Backup sam nie dowodzi prawidłowości. Bez dowodu nie odtwarzać i nie naprawiać
   linków na podstawie założenia. Udokumentować hash przed/po i akceptację.
4. Warunkowo unieważnić VERIFIED_V1 i zwiększyć aktualną wersję Entitlement.
   Dla brakującego zakupu użyć Put z attribute_not_exists(PK). Dla uszkodzonego
   istniejącego rekordu zachować kopię dowodową i użyć warunkowego zastąpienia
   dokładnie oczekiwanego obrazu/atrybutów uszkodzonego rekordu. Konflikt oznacza
   STOP i ponowną analizę; nigdy bezwarunkowy overwrite.
5. Nie cofać Entitlement, Refund, Event ani CheckoutAttempt do punktu backupu.
   Zachować wszystkie nowsze poprawne zakupy/refundy. Aktualny pełny łańcuch
   porównać z uzupełnionym niezależnym manifestem i silnie spójnymi odczytami;
   dopiero potem certyfikować z warunkiem aktualnej wersji i ponownym jej wzrostem.
6. Zapisać ticket, operatora/recenzenta, źródło i punkt restore, warunki zapisu,
   raport walidacji i wynik. Wznowić wyłącznie aktualne writery; retry obserwacji
   z tymi samymi ID, bez nowego refund POST. Bootstrap wymaga ponownego dowodu
   invariantów. Brak PITR/dowodu/kompletności pozostawia automat zablokowany.

## Budżety wydajności — analiza, bez benchmarku

Dla N zakupów chain potrzebuje N sekwencyjnych consistent GetItem. Refund ma
ponadto N-1 odczytów refundów (partie po 8), anchor, korelację i transakcję.
Szacowanie dla samego łańcucha poniżej jest arytmetyką, NIE pomiarem AWS:

| Zakupy | Odczyty chain | przy 10 ms/odczyt | przy 50 ms/odczyt |
| --- | --- | --- | --- |
| 1 | 1 | 10 ms | 50 ms |
| 10 | 10 | 100 ms | 500 ms |
| 50 | 50 | 500 ms | 2500 ms |
| 100 | 100 | 1000 ms | 5000 ms |

Nie obejmuje cold startu, pozostałych odczytów, Stripe GET/POST, retry konfliktów
ani transakcji. Przy wolnych żądaniach nie ma gwarancji zakończenia 100 odczytów:
6 s preflight, 12 s reconciliation z marginesem 4 s, 20 s webhook, 28 s initiate
oraz istniejący SEC-002 22 s ograniczają pracę. Timeout kończy operację błędem,
nie częściowym grantem. Należy później potwierdzić faktyczny timeout resolvera
AppSync i p95/p99 end-to-end; brak benchmarku i wdrożonej konfiguracji nie pozwala
potwierdzić zgodności wszystkich scenariuszy. Checkout verified również ponosi
koszt odczytu całej historii. Nie wprowadzamy dodatkowej architektury bez pomiaru.

Dodatkowe późniejsze testy: usunięta głowa/środek/ogon, zgodnie skrócony łańcuch
względem manifestu, uszkodzone granty w już zwróconym rekordzie, przekroczenie
budżetu przed/po rezerwacji, konflikt wersji preflight, bootstrap off/on, konto
legacy bez Entitlement, niepotwierdzone konto legacy, stara otwarta sesja,
opóźniony/retry webhook przez cutover, dwa pierwsze checkouty, utrata anchora,
restore bez nadpisania nowszych transakcji, IAM denial DeleteItem i brak
niezamierzonych index wildcard. Nie wykonano testów integracyjnych ani E2E.


## Finalna korekta ARCH-005 — rezerwacja i budżet initiate

Konfiguracja w repo: Lambda initiate 28 s (wcześniej 30 s), budżet pracy handlera
25 s względem wejścia do handlera, poniżej limitu żądania AppSync 30 s. Margines
3 s przed końcem Lambdy i 2 s między Lambdą a AppSync nie stanowi pomiaru cold
startu ani gwarancji odpowiedzi klientowi. Nie sprawdzono zasobów wdrożonych.
Stripe: GET PaymentIntent i list refundów po 2 s, POST 4 s, bez retry SDK.
DynamoDB initiate: jedna próba, połączenie 0,5 s, requestTimeout 1,5 s z
throwOnRequestTimeout=true. Wspólny read-only preflight historii zachowuje swój
budżet 6 s i klienta 1/3 s. Rezerwacja wymaga co najmniej 14 s pozostałego
budżetu, uzbrojenie POST 12 s, sam POST 10 s. Ostatni margines pokrywa POST
4 s, zapis wyniku 1,5 s, odczyt po wyścigu z webhookiem 1,5 s i zapis niepewności
1,5 s, zostawiając 1,5 s zapasu. Zbyt wolny preflight kończy się przed rezerwacją.
To budżety lokalnego oczekiwania: AbortSignal, timeout i utrata odpowiedzi NIE
potwierdzają rollbacku transakcji ani anulowania operacji po stronie Stripe.

Maszyna stanów:

- Nowy rekord: NOT_STARTED z losowym attemptId i recoveryAudit; powstaje pod
  warunkiem braku PK w dotychczasowej transakcji walidującej zakup, APPROVED
  i wersję VERIFIED_V1. createdAt, adminId i dane finansowe są zachowane.
- Ponowne jawne zatwierdzenie tej samej sesji/reklamacji przez ADMIN może
  przejąć wyłącznie NOT_STARTED po ponownym pełnym preflightcie (w tym Stripe
  GET, brak refundów i historia). Transakcja porównuje poprzedni attemptId,
  asocjacje finansowe, brak stripeRefundId/lastObservation; zmienia token oraz
  dopisuje operatora, czas i poprzedni token do recoveryAudit. Nie usuwa rekordu.
- Warunkowe NOT_STARTED -> INITIATING (POST_ARMED) wymaga własnego attemptId
  i braku obserwacji/refund ID. Dopiero potwierdzony zapis zezwala na POST.
  Przejęty stary handler nie przejdzie tego warunku. Konkurujące żądanie ADMIN
  przegrywa CAS; nie wysyła POST. Idempotency key pozostaje bez zmian:
  poprostumatma:refund:v1:<CheckoutSessionId>.
- Gdy guard zawiedzie po uzbrojeniu, ale przed wywołaniem SDK POST, właściciel
  może warunkowo zapisać INITIATING -> NOT_STARTED i CONFIRMED_NOT_STARTED
  w audycie. Dopiero ten trwały stan dopuszcza następne zatwierdzenie ADMIN.
- Od wejścia do refunds.create każdy błąd jest konserwatywnie niejednoznaczny:
  INITIATING -> RECONCILIATION_REQUIRED, bez ponawiania POST. Sukces przechodzi
  do AWAITING_RECONCILIATION lub wyniku już zapisanego przez webhook.
  Zapisy wyniku/niepewności wymagają tokena właściciela i odpowiedniego stanu;
  nie nadpisują obserwacji webhooka. Webhook nadal weryfikuje asocjacje i używa
  dotychczasowych transakcji; jego zapis uniemożliwia przejęcie NOT_STARTED.

Utrata odpowiedzi uzbrojenia lub śmierć procesu po POST_ARMED może pozostawić
INITIATING, choć POST faktycznie nie wystartował. Brak POST nie jest wtedy
udowodniony trwałym stanem: obowiązuje ręczne uzgodnienie. Stare rekordy
RECONCILIATION_REQUIRED/INITIATING bez nowego dowodu również pozostają zablokowane;
nie wolno uznać braku refundu w pojedynczym GET za dowód niewysłania POST.
Nie wprowadzono resetu takich rekordów. Błąd zapisu CONFIRMED_NOT_STARTED
również pozostawia stan zamknięty. Audyt rośnie przez list_append; osiągnięcie
limitu rozmiaru elementu blokuje kolejne przejście, zamiast kasować historię.

Ta poprawka nie zmienia cutoveru: PURCHASE_HISTORY_CUTOVER_ID nadal domyślnie
pusty/OFF, brak backfillu i certyfikacji legacy. Wszystkie powyższe prerequisites
migracji, manifestu, anchorów i fail-closed pozostają wymagane. Bez wdrożenia
koszt AWS wynosi zero; po wdrożeniu dochodzi jeden UpdateItem uzbrajający POST,
a przy recovery transakcyjny UpdateItem zamiast Put i wzrost elementu audytu.
Brak nowej tabeli, indeksu, usług i uprawnień. Późniejsza weryfikacja w TEST musi
objąć wyścigi ADMIN/webhook, przerwanie przed/po uzbrojeniu, utratę odpowiedzi,
niepewny POST oraz pomiar p95/p99 z cold startem. Nie wykonano jej w tej zmianie.
