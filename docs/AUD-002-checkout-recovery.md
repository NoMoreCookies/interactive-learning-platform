# AUD-002 — budżety synchroniczne i recovery checkout

Stan: implementacja lokalna, bez wdrożenia, migracji, wywołań AWS/Stripe oraz
odczytu sekretów. Kontrole statyczne i testy transportów w pamięci nie dowodzą
zachowania produkcyjnych SDK, polityk IAM ani rozproszonych awarii.

## Diagnoza i budżety

Przed zmianą checkout miał Lambda=15 s i domyślny Stripe timeout=80 s. Klient
DynamoDB używał domyślnych ustawień. Każde wywołanie generowało nowy UUID;
CheckoutAttempt znał tylko CREATED i PAID, bez trwałego wyniku tworzenia sesji.
Nie było wznowienia tej samej operacji po utracie odpowiedzi. Success odpytuje
lokalny zakup; cancel jest wyłącznie nawigacją i nie unieważnia sesji Stripe.

AppSync ma synchroniczny limit żądania 30 s. Konfiguracja lokalna nie zmienia
tego limitu ani nie dowodzi konfiguracji wdrożenia. Budżety liczą się od wejścia
do handlera; cold start i kolejki wymagają pomiarów przed wydaniem.

| Funkcja | Lambda przed | Lambda po | Budżet handlera |
| --- | ---: | ---: | ---: |
| create-checkout-session | 15 s | 28 s | 24 s |
| public-catalog | domyślne 3 s | 10 s | 8 s |
| public-course-outline | domyślne 3 s | 15 s | 12 s |
| premium-lesson-content | domyślne 3 s | 15 s | 12 s |
| premium-lesson-asset-url | domyślne 3 s | 10 s | 8 s |
| admin-reconcile-refund | 60 s | 28 s | 24 s |
| delete-admin-course | 60 s | 28 s | 24 s |

Wyższy limit odczytów wynika z paginacji, sekwencyjnych zapytań indeksów lub
odczytu Entitlement + trzech poziomów publikacji. Nie zmieniono Scan na Query,
nie usunięto limitu 100 zakupów i nie naprawiano AUD-003/AUD-004.

DynamoDB/S3 w objętych handlerach: jedna próba SDK, connectionTimeout=500 ms,
requestTimeout=1500 ms, throwOnRequestTimeout=true. Request-wide AbortSignal
jest przekazywany do każdego send przez dekorator klienta. AsyncLocalStorage
izoluje kontekst żądania, także w pomocnikach i pętlach paginacji. Wspólny
premium-access przejmuje sygnał wywołującego; poza objętymi budżetem handlerami
jego dotychczasowa konfiguracja SDK pozostaje zachowana.

Stripe checkout: GET i customer POST=2500 ms, session POST=4000 ms,
maxNetworkRetries=0. Pozostaje cooldown 20 s przed operacjami downstream.
Przed transakcyjną rezerwacją wymagane 14 s; przed uzbrojeniem POST 12 s.
Budżet po uzbrojeniu pokrywa uzbrojenie 1.5 s, POST 4 s, zapis ID 1.5 s,
fresh GET 2.5 s, odczyt stanu 1.5 s i zapis READY 1.5 s. Ponieważ te sumy są
większe od minimalnego progu 12 s, osobny guard 6 s przed GET może zakończyć
pierwsze żądanie PO utrwaleniu ID. Kolejne żądanie bez POST kończy recovery.
Budżet 24 s i AbortSignal ograniczają łączną pracę. Nie obiecujemy, że każdy
cold start i każda ścieżka zakończą się sukcesem w jednym żądaniu.

Admin reconciliation: Stripe GET=3 s, bez retry, guard przed każdym GET;
wspólny reconciler dostaje ten sam klient, AbortSignal i margines 4 s przed
transakcją. Nie zmieniono finansowych przejść ani polityki przeliczania.
Usuwanie zachowuje ograniczone retry aplikacyjne UnprocessedItems/błędów S3;
backoff sprawdza pozostały budżet przed oczekiwaniem.

Timeout/abort nie dowodzi anulowania operacji po stronie usługi. Dotyczy to
zarówno Stripe POST, jak i transakcji DynamoDB. Nie ma Promise.race udającego
anulowanie ani niewidocznych zadań zapisujących po zwróceniu odpowiedzi.

## Identyfikacja zamiaru i rezerwacja

Przeglądarka zapisuje UUIDv4 purchaseIntentId w sessionStorage pod kluczem
zawierającym lokalny Cognito userId. To identyfikator operacji, nie credential.
Nie jest usuwany przy błędzie sieci, cooldown ani cancel. Autoryzacja nadal
pochodzi wyłącznie z AppSync/Cognito; klient nie wybiera właściciela ani ceny.
Identyfikator CheckoutAttempt to SHA-256 pary [backend userId, purchaseIntentId].
Zapisany historyczny zamiar jest sprawdzany przed aktywnym wskaźnikiem, więc
spóźnione ponowienie opłaconego zamiaru nie staje się nowym zakupem.

BillingCustomer.activeCheckoutAttemptId i nowy CheckoutAttempt są zapisywane
atomowo. Warunek porównuje poprzedni wskaźnik i Stripe Customer. Dwa żądania
nie rezerwują niezależnych aktywnych prób. Przegrany otrzymuje błąd; po cooldown
może odzyskać istniejącą próbę. Różny zamiar z innej karty jest blokowany, dopóki
aktywny nie zostanie bezpiecznie rozstrzygnięty. Brak nowej tabeli i brak TTL
na wskaźniku finansowym; TTL rate limitera nie usuwa dowodu niepewności.

## Stany

Finansowy status pozostaje CREATED -> PAID; wyłącznie dotychczasowa transakcja
podpisanego webhooka nadaje dostęp i PAID. Dodatkowy sessionCreationState:

- NOT_STARTED: próba zarezerwowana; POST nie został uzbrojony.
- CREATING: trwały warunkowy zapis zezwolił na POST. Wynik może być nieznany.
- SESSION_KNOWN: utrwalono ID po POST, przed kolejnymi odczytami Stripe.
- READY: fresh GET zweryfikowany; sesja open/unpaid może być zwrócona.
- EXPIRED: GET potwierdził expired/unpaid; można wybrać nowy zamiar.
- NOT_STARTED_EXPIRED: po godzinie bez POST próba warunkowo odgrodzona przed
  starymi wywołaniami; można wybrać nowy zamiar. Pierwszy expires_at był stały,
  dwie godziny od utworzenia, więc nie wysyłamy go dopiero po wygaśnięciu.
- PAYMENT_FAILED: podpisany async_payment_failed zapisał wynik. Nowy zamiar
  wymaga dodatkowo GET potwierdzającego complete/unpaid.

PAID jest finansowym stanem terminalnym. complete/paid przed lokalnym PAID
blokuje nowy zakup do nadejścia webhooka; nie wystawia aktywnego URL. Ten sam
zamiar po PAID zwraca COMPLETED/sessionId do istniejącej strony success.
Powiązanie sessionStorage zamiaru z sessionId jest usuwane dopiero po
potwierdzonym zakupie; stary success URL nie usuwa innego nowego zamiaru.
EXPIRED usuwa identyfikator zamiaru, a kolejny świadomy klik tworzy nowy.

Cancel nie jest finansowym stanem: ponowienie wznawia otwartą sesję. Nowe
sesje wygasają po dwóch godzinach. Nie dodano endpointu Stripe expire ani
zaufania do klientowego przekierowania.

## Niejednoznaczny POST i recovery

Niezmienne sessionParameters obejmują również redirecty, metadata i expires_at.
Replay używa dokładnie tych parametrów i klucza
poprostumatma:checkout:<checkoutAttemptId>, bez automatycznych retry SDK.
Błąd PO uzbrojeniu pozostawia CREATING; nie otwiera nowej próby. Utrata odpowiedzi
transakcji odzyskiwana jest przez deterministyczny klucz i consistent GetItem.

Nieznane ID można odzyskać przez replay do 23 h od utworzenia próby, poniżej
minimalnego 24 h przechowywania klucza przez Stripe. Po tym oknie nie wolno
ponowić POST: potrzebne ręczne uzgodnienie, bez usuwania rekordu. Nie zmieniono
tego w automatyczny reset na podstawie pustego list/search. Zatrzymane POST,
cached błędy Stripe lub niespójne dane także mogą wymagać operatora.

Znane ID wymaga fresh GET z line_items. Walidowane są właściciel, Customer,
tryb środowiska, payment mode, sesja, plan/metadata, kwota, waluta, Price,
ilość i status. Otwarta sesja musi odpowiadać również obecnie wybranej ofercie
i wersjom zgód. Zmiana warunków nie tworzy obok niej niezależnej sesji.

Webhook PAID może wygrać przed utrwaleniem odpowiedzi POST lub READY. Warunki
CREATED i zgodności sessionId blokują nadpisanie. Błąd takiego CAS jest bezpieczny;
ponowienie odczytuje PAID. Oryginalna transakcja Purchase/Event/Entitlement/Attempt,
wersja historii, VERIFIED_V1 i circuit breakers refundów pozostają zachowane.
Nie deklarujemy exactly-once delivery ani automatycznego podwójnego obciążenia
przez sam fakt istnienia dwóch sesji.

## Bezpieczny rollout — niewykonany

Nowy kontrakt GraphQL wymaga purchaseIntentId: frontend i backend wdrożyć
koordynowanie. Stare klienty fail closed; nie dodawać fallbacku z nowym UUID
na serwerze, bo odtworzyłby błąd AUD-002.

Nowy BillingCustomer tworzony przez tę wersję ma checkoutRecoveryReady=true.
ISTNIEJĄCY klient bez tego znacznika jest blokowany: brak wskaźnika nie dowodzi
braku historycznych open/pending/ambiguous sesji. Ta zmiana NIE certyfikuje
legacy automatycznie i NIE wykonuje migracji. Przed wdrożeniem do starego
środowiska potrzebna osobno autoryzowana procedura:

1. Zatrzymać stare writery i uwzględnić stare klienty, Lambdy i otwarte sesje.
2. Uzgodnić pełne inventory prób/sesji/płatności. Nie zakładać, że były TEST.
3. Rozstrzygnąć lub zachować blokadę istniejących open/pending/unknown prób;
   nie oznaczać klienta jako pustego na podstawie samego czasu/cooldown.
4. Dopiero dla udokumentowanego bezpiecznego stanu warunkowo zatwierdzić marker
   lub przygotować osobną zgodną ścieżkę adopcji istniejącej sesji.
5. Osobno zweryfikować historię finansową; checkoutRecoveryReady nie zastępuje
   VERIFIED_V1 ani PURCHASE_HISTORY_CUTOVER_ID. Nie włączono żadnego gate.

Nowe izolowane środowisko nie usuwa zobowiązań wcześniejszego środowiska.
Brak przeprowadzonego rollout/inventory jest blokadą wydania do istniejących
klientów, a nie dowodem gotowości produkcyjnej.

## IAM, koszty i pozostałe ryzyka

Checkout otrzymuje GetItem/PutItem/UpdateItem na dokładnych ARN istniejących
CheckoutAttempt i BillingCustomer. Get/Put Customer już istniały; nowe są
Get/Update Attempt i Update Customer. Brak Scan, Query, Delete, wildcard,
nowych tabel i dostępu checkout do Entitlement/Purchase/Event. IAM nie ogranicza
nazw aktualizowanych atrybutów: niezmienność kontraktu egzekwuje kod, tak jak
warunkowy Put chronił go wcześniej. Klucz Stripe wykonujący checkout musi
pozwalać także na retrieve session/line_items; efektywnych praw nie sprawdzono.

Dodatkowy koszt: consistent GetItem, transakcja wskaźnika/próby, zapisy stanu,
fresh Stripe GET i większy element snapshotu. Cooldown nadal ogranicza recovery.
Brak retry SDK zmniejsza amplifikację; użytkownik może ponawiać po cooldown.
Nie wprowadzono listowania Stripe ani pełnych skanów. Wyższy limit Lambdy
może zwiększyć koszt pojedynczego błędu, ale budżet ogranicza ten wzrost.

Duże usuwanie kursu NIE ma gwarancji ukończenia synchronicznego. Pozostają
częściowe usunięcia, GSI lag i brak trwałego zadania (AUD-006). Obniżenie sufitu
z 60 do 28 s nie naprawia recovery; nie udawać sukcesu po przerwaniu. Osobny
workflow asynchroniczny jest wymagany dla dużych kursów. Brak przebudowy tutaj.

## Walidacja i późniejsze testy

Lokalne testy używają wyłącznie atrap transportu w pamięci. Pokrywają utratę
odpowiedzi POST/rezerwacji/zapisu ID, retry, konkurencję zamiarów, wygasanie,
23 h, legacy gate, opóźniony PAID, zmianę właściciela/klienta/trybu/kwoty/waluty/
planu/Price i izolację budżetów. Nie dowodzą poprawności wyrażeń DynamoDB ani
faktycznej idempotencji Stripe. Istniejące testy refund-entitlement też są offline.

Przed wydaniem wykonać osobno w Stripe TEST/AWS sandbox:

- Utrata odpowiedzi po rzeczywistym commicie DynamoDB i po przyjęciu POST Stripe.
- Równoległe karty, utrata sessionStorage, zmiana oferty i stare klienty.
- SDK timeout/AbortSignal, cold start, p95/p99, limit AppSync i IAM denial.
- Replay tego samego klucza/parametrów, idempotency conflict/cached error,
  odzyskanie wygasłej sesji, brak replay poza oknem retencji.
- Webhook przed odpowiedzią POST, przed zapisem READY, delayed async success/fail.
- Spójność transakcji finansowej po refundzie i zakupie współbieżnym.
- Paginowane odczyty, UnprocessedItems/S3 failures, przerwana duża delecja.
- Dowód legacy inventory i kontrolowany rollout bez starego writera.

AUD-002: poprawki kodu w objętym zakresie są weryfikowalne statycznie;
odbiór operacyjny, legacy rollout i długie usuwanie pozostają release-gated.

Wyniki wykonanych kontroli: TypeScript frontend PASS, TypeScript backend PASS,
ESLint 0 błędów / 3 wcześniejsze ostrzeżenia, git diff --check PASS.
Testy checkout-recovery + refund-entitlement: 34/34 PASS. Runner tsx wymagał
zezwolenia na lokalny IPC poza sandboxem; same testy pozostały offline.

Zmienione pliki:

- amplify/backend.ts
- amplify/data/resource.ts
- amplify/data/create-checkout-session/handler.ts
- amplify/data/create-checkout-session/resource.ts
- amplify/data/public-catalog/handler.ts
- amplify/data/public-catalog/resource.ts
- amplify/data/public-course-outline/handler.ts
- amplify/data/public-course-outline/resource.ts
- amplify/data/premium-lesson-content/handler.ts
- amplify/data/premium-lesson-content/resource.ts
- amplify/data/premium-lesson-asset-url/handler.ts
- amplify/data/premium-lesson-asset-url/resource.ts
- amplify/data/admin-reconcile-refund/handler.ts
- amplify/data/admin-reconcile-refund/resource.ts
- amplify/data/delete-admin-course/handler.ts
- amplify/data/delete-admin-course/resource.ts
- amplify/functions/stripe-webhook/handler.ts
- amplify/shared/premium-access.ts
- amplify/shared/checkout-session.ts (nowy)
- amplify/shared/resolver-budget.ts (nowy)
- lib/services/billing-service.ts
- tests/checkout-recovery.test.ts (nowy)
- docs/AUD-002-checkout-recovery.md (nowy)
