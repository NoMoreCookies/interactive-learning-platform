# SEC-002 — import istniejących zewnętrznych zwrotów

Status: implementacja lokalna, bez wdrożenia. SEC-002 nie jest w pełni zweryfikowane;
konieczne są późniejsze testy integracyjne i bezpieczeństwa. Nie wykonano połączeń
z AWS/Stripe, płatności, zwrotów ani odczytu sekretów.

## Przepływ

1. Webhook weryfikuje podpis i tryb Stripe. Tylko jawny `MissingRefundCorrelation`
   (brak metadanych/rezerwacji albo rekord importowany wymagający odczytu API)
   uruchamia zapis do StripeEvent z kluczem Stripe event ID i warunkiem nieistnienia.
   Nie zapisujemy payloadu, metadanych reklamacji, klienta, PaymentIntent ani kwoty.
   Zdarzenie zawiera refund ID, stały kod powodu, czas zapisu i znacznik kolejki.
   Powtórzenie jest bezpieczne; awaria zapisu oznacza HTTP 500, nigdy pozorne 200.
   Niespójność istniejącej rezerwacji i nieoczekiwane wyjątki nadal powodują 500.
2. ADMIN otwiera `/admin/refund-import`, odświeża stronicowaną kolejkę i ustala
   zakup w zaufanej księdze. Wpisuje Checkout Session i refund ID, następnie
   potwierdza oba identyfikatory w osobnym kroku. Operacja nie tworzy refundu.
3. AppSync i Lambda niezależnie wymagają ADMIN. Lambda pobiera lokalny zakup
   silnie spójnie, a z API Stripe odczytuje Refund, PaymentIntent, Checkout Session
   i pełną listę refundów (limit 100, `has_more` blokuje import).
4. Wyłącznie pojedynczy pełny refund `succeeded`, zgodny z PI, customer, kwotą
   w jednostkach minor, walutą, opłaconym Checkout i trybem środowiska, może być
   zarezerwowany. Dane właściciela pochodzą z niezmiennego BillingPurchase.
5. Transakcja sprawdza snapshot zakupu i tworzy warunkowo BillingRefund pod
   istniejącym PK `stripeCheckoutSessionId`, z `origin=EXTERNAL_IMPORT`, bez
   fikcyjnego complaintId. W StripeEvent zapisuje nieusuwalne roszczenia
   `refund_link_<refundId>` i `refund_pi_<piId>`, zabezpieczając również powiązanie
   refund/PI z pojedynczym zakupem. Rekordy te nie są webhookami.
6. Wspólny reconciler sprawdza marker, refund, PI, właściciela, klienta, kwotę
   i walutę; transakcyjnie zapisuje wynik, status refundu i przeliczone Entitlement.
   Zachowuje blokadę wersji, odczyt zakupów ocalałych i ochronę przed starszymi
   obserwacjami. Powtórny import nie zmienia ponownie dostępu.

## Kolejka i obsługa operacyjna

`adminListRefundReviews` ma odrębne uprawnienia tylko do odczytu i korzysta ze
sparse GSI `reviewState-eventId-index`. Strony mają do 25 wpisów. Kolejkę należy
sprawdzać regularnie; jest to mechanizm przeglądu, nie nowe powiadomienie push.
Istniejące alarmy HTTP 5xx pozostają bez zmian. Lista jest ostatecznie spójna.
Historyczne wpisy pozostają zachowane. Po imporcie ich wyświetlany wynik jest
wyliczany jako ALREADY_RECONCILED na podstawie silnie spójnego odczytu roszczenia
refund ID i końcowego BillingRefund. Nie zakładamy atomowego zamknięcia wszystkich
historycznych wpisów ani usuwania historii. Kolejka może mieć wiele zdarzeń dla
jednego refundu, ale nigdy nie skutkuje automatycznym odebraniem Premium.

Odmowy znane podczas importu są również utrwalane idempotentnie pod ograniczonym
kluczem zakup/refund/powód, bez dowolnego tekstu administratora lub błędu Stripe.
Nieznany refund, brak PI, błędny klient/Checkout/kwota/waluta, stany inne niż
succeeded, częściowe i wielokrotne refundy wymagają ręcznej kontroli. Błędy
infrastruktury propagują się; nie są zamieniane na sukces ani manual-review.
Po awarii pomiędzy rezerwacją i reconciliation ponowny import ponownie weryfikuje
Stripe i kontynuuje istniejący rekord. Webhook nigdy nie finalizuje importowanego
refundu samodzielnie: dla tej ścieżki wymagany jest świeży odczyt API przez ADMIN.

## Uprawnienia

Nowa Lambda importująca korzysta wyłącznie z `STRIPE_REFUND_READ_KEY` (restricted
`rk_test_`/`rk_live_` zgodnego z istniejącym trybem). Nie otrzymuje
`STRIPE_SECRET_KEY`, nie zawiera `refunds.create` i ma `maxNetworkRetries=0`.
Konfiguracja istniejącego restricted key musi zezwalać wyłącznie na wymagane
odczyty Refunds, PaymentIntents i Checkout Sessions, bez praw zapisu/tworzenia
refundów. Sam prefiks rk nie dowodzi read-only — rzeczywiste uprawnienia klucza
muszą zostać niezależnie sprawdzone przed wdrożeniem. Nie zweryfikowano ich tutaj.
Nie zmieniono trybu LIVE ani `REFUND_EXECUTION_ENABLED`.

IAM importu: GetItem/PutItem/UpdateItem dla BillingRefund, GetItem i
ConditionCheckItem dla BillingPurchase, Query wyłącznie na userId-index,
GetItem/UpdateItem dla Entitlement i GetItem/PutItem dla StripeEvent.
IAM kolejki: GetItem dla StripeEvent i BillingRefund, Query wyłącznie na nowym
GSI. Polityki nowych operacji używają konkretnych ARN tabel/indeksów, bez DynamoDB wildcard.
Istniejące granty StripeEvent webhooka i adminReconcileRefund zastąpiono również
jawnymi ARN tabeli, aby dodanie GSI nie dopisało przez helper CDK `index/*`.
Entitlement jest modyfikowane wyłącznie przez zweryfikowany wspólny reconciler.
Kod infrastruktury jest przygotowany, ale żadne zasoby nie zostały wdrożone.

## Zgodność i ograniczenia

Wewnętrzny adminInitiateRefund i jego UI pozostają bez zmian: ADMIN, zatwierdzona
reklamacja, rezerwacja, weryfikacja zakupu/PI, idempotency key i circuit breaker.
Brak origin oznacza dotychczasowy rekord wewnętrzny; wymaganie complaintId
pozostaje dla niego obowiązkowe. Import nie może przejąć istniejącej rezerwacji
wewnętrznej, nawet jeśli wskazany refund pasuje — pozostaje stara operacja
adminReconcileRefund. Nie zmieniono SEC-001/MFA ani ARCH-003.

Nie obsługujemy automatycznie refundów częściowych, wielu refundów (również
historycznych nieudanych obok udanego), sporów, zwrotów bez jednoznacznego PI,
uszkodzonej księgi ani specjalnych wcześniejszych blokad Entitlement.
Limit reconciler: 100 zakupów użytkownika; opóźniony GSI blokuje bezpieczne
przeliczenie. Błąd reconciler po rezerwacji wymaga ponownego importu/kontroli.
Weryfikacja Stripe i DynamoDB nie stanowi wspólnej transakcji rozproszonej;
pojedynczy pełny succeeded refund ogranicza ryzyko równoległych zmian w Dashboard.
Kolejka nie ustala automatycznie właściciela z metadanych; operator musi ustalić
zakup niezależnie. Historia i roszczenia nie mają TTL, aby zachować idempotencję.

## Koszty AWS

Bez wdrożenia brak nowych kosztów AWS w tej fazie. Po przyszłym wdrożeniu:
dwie Lambdy uruchamiane na żądanie, zapisy zdarzeń i dwóch roszczeń przy imporcie,
transakcje DynamoDB oraz silnie spójne odczyty. Sparse GSI zwiększa storage i
koszt zapisów wyłącznie dla rekordów kolejki. Widok wykonuje do 25 odczytów
roszczeń i do 25 dodatkowych odczytów BillingRefund na stronę. Reconciliation
zachowuje istniejący limit pracy dla 100 zakupów. Historia rośnie z liczbą
zdarzeń i par zakup/refund zgłaszanych przez ADMIN. Brak pollingu, harmonogramu
lub nowej stałej floty; istniejące logowanie/monitoring nadal generuje swoje koszty.

## Testy do wykonania w fazie skonsolidowanej — wszystkie NOT RUN

### Jednostkowe

- ADMIN i odmowa dla gościa, zwykłego użytkownika, brakujących/zmienionych claims.
- Potwierdzenie obu identyfikatorów, walidacja cs_, re_, pyr_, granice długości.
- Brak metadanych vs brak rezerwacji vs wyjątek odczytu/uszkodzony rekord.
- Dokładne dane PI, Checkout, właściciela i klienta; grosze zamiast kwoty decimal.
- Nieznany refund/PI/Checkout, brak PI, inna waluta/kwota/tryb, niepoprawny klucz.
- Refund partial/pending/failed/canceled/requires_action/null oraz wiele refundów,
  lista pusta/has_more i zmiana danych pomiędzy retrieve a list.
- Warunki DynamoDB, brak nieużytych expression aliases/values, brak complaintId
  dla importu, brak możliwości obejścia wewnętrznej rezerwacji/metadanych.
- Idempotencja udanego importu, niezmienność asocjacji przy ponownym odczycie.
- Błędy API/DB propagują się; tylko resource_missing daje jawny manual-review.
- Brak refund POST/automatycznego retry i brak sekretów/PII w logach/API.
- Kolejka: paginacja, wadliwy token, opóźnienie indeksu, historyczny resolved,
  brak dostępu do innych partycji, brak rozszerzania uprawnień z cursor.
- UI: krok potwierdzenia, zablokowanie podwójnego kliknięcia, anulowanie,
  success/already-reconciled/manual-review/nieznany wynik i ochrona ADMIN.

### Integracyjne i bezpieczeństwa (wyłącznie późniejsze autoryzowane środowisko TEST)

- Prawidłowy i błędny podpis webhooka; zły tryb; brak korelacji utrwalony przed
  2xx; awaria/throttling zapisu daje 5xx i późniejszy retry zapisuje jeden wpis.
- Dwa identyczne webhooki, webhook przed/podczas/po imporcie; brak podwójnej
  korekty Entitlement i widoczna historia przeglądu.
- Dwa importy tego samego refundu i dwa różne refundy/zakupy z tym samym PI;
  jeden zwycięzca warunkowych roszczeń, konflikt bez częściowego zapisu.
- Import ściga się z wewnętrzną rezerwacją; wewnętrzna inicjacja po imporcie
  nie wykonuje POST; istniejący internal reconciler działa bez zmian.
- Awaria po rezerwacji, przed/po commit; timeout odpowiedzi po commit;
  powtórny import odzyskuje wynik i nie zmienia wersji Entitlement drugi raz.
- Równoległy nowy zakup, inny refund, opóźniony GSI, konflikt wersji,
  starszy webhook, wcześniejsza blokada Entitlement i limit 100 zakupów.
- Recalculation dla zera/jednego/wielu ocalałych zakupów i późnych płatności.
- Rzeczywiste AppSync group auth, Lambda identity, MFA regresja SEC-001,
  brak zmian LIVE/circuit breaker ARCH-003.
- Polityki IAM po syntezie: konkretne tabele i GSI, brak Scan/Delete/wildcard,
  brak praw zapisu dla review Lambda, brak refund-create secret dla importu.
- Restricted key ma wymagane GET i odmawia refund POST; tryb test/live
  i konto Stripe odpowiadają zaufanej lokalnej księdze.
- Dostępność GSI po migracji, opóźnienie widoczności kolejki, uprawnienia
  operatorów i procedura regularnego przeglądu.

Walidacja lokalna zakończona powodzeniem: TypeScript frontend/backend, ESLint
zmienionych plików TS/TSX oraz `git diff --check`. Nie uruchamiano testów jednostkowych,
integracyjnych ani E2E i nie deklarujemy ich powodzenia.
