# TESTING.md

Production-readiness test plan generated from the code review performed so far.

## Current audited scope

- `components/auth/AuthProvider.tsx`
- `components/auth/LegalAccessGuard.tsx`
- `lib/legal-acceptance.ts`
- related authentication, authorization, legal-access, race-condition, pagination, failure-mode and cost-abuse behavior

## Status legend

- ✅ PASS — executed and passed
- ❌ FAIL — executed and failed
- 🟡 OPEN — architecture/legal/backend point still requires verification
- ⚪ NOT RUN — not executed yet

> **Important:** a code review is not a passing test. A test becomes `PASS` only after it is actually executed.

**Total test cases currently documented: 92**

## Test matrix

| ID | Area | Scenario | Preconditions / Steps | Expected result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| AUTH-01 | AuthProvider | Guest initialization | No active Cognito session; open app and wait for auth check. | user=null; isAuthenticated=false; isAdmin=false; isLoading=false; no crash. | E2E | Normal | ⚪ NOT RUN |
| AUTH-02 | AuthProvider | Authenticated user initialization | Valid normal-user session; hard refresh app. | User restored; isAuthenticated=true; isAdmin=false; isLoading=false. | E2E | Normal | ⚪ NOT RUN |
| AUTH-03 | AuthProvider | ADMIN initialization | Valid ADMIN session; hard refresh app. | User restored; isAuthenticated=true; isAdmin=true. | E2E | High | ⚪ NOT RUN |
| AUTH-04 | AuthProvider | User without ADMIN group | Login normal user. | isAuthenticated=true; isAdmin=false. | E2E | High | ⚪ NOT RUN |
| AUTH-05 | AuthProvider | Malformed cognito:groups | Pass malformed group value, e.g. ["ADMIN",123,null], to readGroups(). | Invalid entries removed; valid strings preserved; no crash. | Unit | High | ⚪ NOT RUN |
| AUTH-06 | AuthProvider | Missing cognito:groups | Use token without cognito:groups. | readGroups returns []; isAdmin=false; no crash. | Unit / Integration | High | ⚪ NOT RUN |
| AUTH-07 | AuthProvider | Logout | Authenticated user logs out. | Session terminated; user=null; isAuthenticated=false; isAdmin=false; legal cache cleared. | E2E | High | ⚪ NOT RUN |
| AUTH-08 | AuthProvider | Double logout | Trigger logout twice rapidly. | No inconsistent state, re-authentication, infinite loading or uncontrolled requests. | Integration | High | ⚪ NOT RUN |
| AUTH-09 | AuthProvider | Account switch | Login A; logout; login B. | Only B state remains; A state does not leak; isAdmin reflects B. | E2E | High | ⚪ NOT RUN |
| AUTH-10 | AuthProvider | Legal cache cleared on account switch | A has legal cache; logout A; login B. | A legal cache is not reused for B. | Integration | High | ⚪ NOT RUN |
| AUTH-11 | AuthProvider | Legal cache retained for same user | Verified user calls refreshAuth without account change. | Legal cache remains valid; no unnecessary legal verification. | Integration | Normal | ⚪ NOT RUN |
| AUTH-12 | AuthProvider | Terms version changed | Cache for Terms 1.0; current Terms becomes 2.0. | isCurrentLegalVerified=false. | Unit | High | ⚪ NOT RUN |
| AUTH-13 | AuthProvider | Privacy version changed | Cache for Privacy 1.0; current Privacy becomes 2.0. | isCurrentLegalVerified=false. | Unit | High | ⚪ NOT RUN |
| AUTH-14 | AuthProvider | Successful refreshAuth | Valid authenticated session; call refreshAuth. | Loading true during check; user/session loaded; ADMIN evaluated; loading false at end. | Integration | Normal | ⚪ NOT RUN |
| AUTH-15 | AuthProvider | Failed refreshAuth | No valid session or auth failure; call refreshAuth. | user=null; isAdmin=false; legal cache cleared; loading=false; no privileges granted. | Integration | High | ⚪ NOT RUN |
| AUTH-16 | AuthProvider | Derived isAuthenticated | Test with null user and valid user. | isAuthenticated always equals user !== null. | Unit | Normal | ⚪ NOT RUN |
| AUTH-17 | AuthProvider | useAuth outside provider | Render consumer without AuthProvider. | Clear error explaining useAuth must be inside AuthProvider. | Unit | Normal | ⚪ NOT RUN |
| AUTH-18 | AuthProvider | Concurrent refresh: newest wins | Start refresh A then B; B finishes first, A later. | A is stale and cannot overwrite B. | Integration | Critical | ⚪ NOT RUN |
| AUTH-19 | AuthProvider | Stale success ignored | A has old data; B newer; B succeeds first; A succeeds later. | Final state remains based on B. | Integration | Critical | ⚪ NOT RUN |
| AUTH-20 | AuthProvider | Stale error ignored | A starts; B succeeds; A fails later. | Old A error cannot clear B's successful state. | Integration | Critical | ⚪ NOT RUN |
| AUTH-21 | AuthProvider | Loading belongs to newest refresh | Start A then B; finish A while B still runs. | isLoading stays true until newest refresh B finishes. | Integration | High | ⚪ NOT RUN |
| AUTH-22 | AuthProvider | Refresh then logout race | Start refresh; logout before it finishes; let old refresh finish. | Old refresh cannot restore user/admin after logout. | Integration | Critical | ⚪ NOT RUN |
| AUTH-23 | AuthProvider | Logout invalidates previous generation | Refresh generation N; logout increments generation; N later finishes. | Generation mismatch causes result N to be ignored. | Integration | Critical | ⚪ NOT RUN |
| AUTH-24 | AuthProvider | Refresh during logout | Start logout; call refreshAuth while logout runs. | Refresh cannot restore stale auth; logout remains authoritative. | Integration | High | ⚪ NOT RUN |
| AUTH-25 | AuthProvider | signOut failure | Simulate Cognito/Amplify signOut error. | No permanent loading and no privileges granted; behavior matches documented policy. | Integration | High | ⚪ NOT RUN |
| AUTH-26 | AuthProvider | No refresh loop | Mount provider and observe state changes/rerenders. | No refresh -> state -> rerender -> refresh loop. | Regression / Performance | High | ⚪ NOT RUN |
| AUTH-27 | AuthProvider | Session restoration after reload | Valid existing session; hard refresh browser. | Session restored without login; auth state converges correctly. | E2E | High | ⚪ NOT RUN |
| AUTH-28 | AuthProvider | Expired access token with refresh capability | Expired access token but renewable session; trigger auth operation. | SDK refreshes session if possible or returns controlled auth error; stale React state grants nothing. | Integration | High | ⚪ NOT RUN |
| AUTH-29 | AuthProvider | ADMIN membership removed | Remove ADMIN group; refresh/re-establish session. | Current token no longer yields ADMIN; isAdmin=false. | Security regression | Critical | ⚪ NOT RUN |
| AUTH-30 | AuthProvider | Frontend isAdmin tampering | Normal user manipulates local state to isAdmin=true and calls admin API. | UI may change; backend rejects operation; no privilege escalation. | Security | Critical | ⚪ NOT RUN |
| LEGAL-01 | LegalAccessGuard | Guest on normal page | Unauthenticated user opens /courses. | No legal verification required for guest flow; no redirect loop. | E2E | Normal | ⚪ NOT RUN |
| LEGAL-02 | LegalAccessGuard | Auth still loading | Enter guarded route before auth initialization completes. | Protected children do not render while auth state is unknown. | Integration | High | ⚪ NOT RUN |
| LEGAL-03 | LegalAccessGuard | Already legally verified | Authenticated user has current legal cache; navigate protected routes. | Content renders; no unnecessary backend legal check. | E2E | Normal | ⚪ NOT RUN |
| LEGAL-04 | LegalAccessGuard | Authenticated but unverified | Authenticated user with isCurrentLegalVerified=false opens protected route. | Protected children do not mount; legal check starts; UI stays blocked. | Integration | Critical | ⚪ NOT RUN |
| LEGAL-05 | LegalAccessGuard | Requirement none | Backend confirms current legal acceptance. | markCurrentLegalVerified runs; children render only afterward. | Integration | High | ⚪ NOT RUN |
| LEGAL-06 | LegalAccessGuard | Terms update required | User has outdated Terms; open protected route. | Redirect to /auth?legal=required; protected content not rendered. | E2E | Critical | ⚪ NOT RUN |
| LEGAL-07 | LegalAccessGuard | Privacy update required | User has outdated Privacy acceptance. | Redirect to legal acceptance; content unavailable. | E2E | Critical | ⚪ NOT RUN |
| LEGAL-08 | LegalAccessGuard | Both legal docs outdated | Both Terms and Privacy outdated. | Redirect to legal acceptance; children do not mount. | E2E | Critical | ⚪ NOT RUN |
| LEGAL-09 | LegalAccessGuard | Backend legal check error | Force getLegalUpdateRequirement failure. | Fail-closed; children blocked; redirect to legal-required; no access. | Failure | Critical | ⚪ NOT RUN |
| LEGAL-10 | LegalAccessGuard | Backend legal check timeout | Delay/timeout legal verification. | Children never mount before success; no fail-open. | Failure | High | ⚪ NOT RUN |
| LEGAL-11 | LegalAccessGuard | /auth allowed | User requires legal acceptance; open /auth. | Page accessible; no redirect loop. | E2E | High | ⚪ NOT RUN |
| LEGAL-12 | LegalAccessGuard | Terms page allowed | Open /termsAndConditions while legal acceptance required. | Page remains accessible. | E2E | High | ⚪ NOT RUN |
| LEGAL-13 | LegalAccessGuard | Privacy page allowed | Open /privacyPolicy while legal acceptance required. | Page remains accessible. | E2E | High | ⚪ NOT RUN |
| LEGAL-14 | LegalAccessGuard | Allowed subpath | Pass valid subpath of allowed route to isAllowedPath. | Returns true according to intended route policy. | Unit | Normal | ⚪ NOT RUN |
| LEGAL-15 | LegalAccessGuard | Similar path not accidentally allowed | Test path such as /authentication. | Not treated as allowed merely due to similar prefix. | Unit | High | ⚪ NOT RUN |
| LEGAL-RACE-01 | LegalAccessGuard | Logout during legal check | Start legal check for A; logout; let old check finish. | A result ignored after cleanup; no post-logout state change. | Integration | High | ⚪ NOT RUN |
| LEGAL-RACE-02 | LegalAccessGuard | A check then B login | A starts check; logout A; login B; A response arrives. | A result ignored; B verified independently; no cross-account leak. | Integration | Critical | ⚪ NOT RUN |
| LEGAL-RACE-03 | LegalAccessGuard | Navigate to allowed path during check | Start check on protected route; navigate /auth; old response arrives. | Old effect does not redirect/update current allowed route incorrectly. | Integration | High | ⚪ NOT RUN |
| LEGAL-RACE-04 | LegalAccessGuard | Navigate between protected pages during check | Start check on route A; move to route B; old effect resolves. | No stale effect applied to wrong route context. | Integration | Normal | ⚪ NOT RUN |
| LEGAL-RACE-05 | LegalAccessGuard | Success after cleanup | Start request; trigger effect cleanup; resolve old request successfully. | isCancelled prevents stale result usage. | Integration | High | ⚪ NOT RUN |
| LEGAL-RACE-06 | LegalAccessGuard | Error after cleanup | Start request; cleanup; old request fails. | Old error cannot redirect current user/route incorrectly. | Integration | High | ⚪ NOT RUN |
| LEGAL-RACE-07 | LegalAccessGuard | Legal version changes during lifetime | Old version cached; increase current Terms/Privacy version. | Cache becomes invalid; isCurrentLegalVerified=false; new verification required. | Integration | High | ⚪ NOT RUN |
| LEGAL-CRITICAL-01 | LegalAccessGuard | Children never mount before verification | Authenticated unverified user; child has mount side effect; delay legal response. | Before success: no child mount/effect/request. On success: mount. On failure: remain blocked + redirect. | Integration / Security regression | Critical | ⚪ NOT RUN |
| LEGAL-FAIL-01 | LegalAccessGuard | Backend server error | Force legal backend server error. | Protected content unavailable; error never interpreted as verified. | Failure / Security | Critical | ⚪ NOT RUN |
| LEGAL-FAIL-02 | LegalAccessGuard | AppSync legal request rejected | Reject legal request at AppSync. | No access; fail-closed. | Failure / Security | Critical | ⚪ NOT RUN |
| LEGAL-FAIL-03 | LegalAccessGuard | Client offline | Authenticate; go offline before legal verification; enter protected route. | No automatic access to protected content. | Failure | High | ⚪ NOT RUN |
| LEGAL-FAIL-04 | LegalAccessGuard | Unexpected legal helper exception | Throw unexpected error in helper. | No fail-open; protected flow remains blocked. | Failure | Critical | ⚪ NOT RUN |
| LEGAL-FAIL-05 | LegalAccessGuard | Cache belongs to another user | Use legal cache with mismatched userId. | Cache rejected. | Security regression | Critical | ⚪ NOT RUN |
| LEGAL-FAIL-06 | LegalAccessGuard | Cache has old document version | Use cache with old Terms/Privacy version. | Cache rejected; new legal verification required. | Security regression | High | ⚪ NOT RUN |
| SEC-AUTHZ-01 | Backend authorization | Manipulated isAdmin | Normal user forces local isAdmin=true then calls admin operation. | Backend rejects; React state cannot grant privileges. | Security | Critical | ⚪ NOT RUN |
| SEC-AUTHZ-02 | Backend authorization | Direct ADMIN API request | Normal user bypasses UI and calls ADMIN AppSync mutation directly. | Unauthorized/forbidden; operation not executed. | Security | Critical | ⚪ NOT RUN |
| SEC-AUTHZ-03 | Backend authorization | LegalAccessGuard bypass | User without current legal acceptance bypasses React and calls protected backend operations. | Behavior must match final backend legal/business rules; frontend guard cannot be sole control where backend legal enforcement is required. | Security / Architecture verification | Critical | 🟡 OPEN |
| SEC-AUTHZ-04 | Backend authorization | Guest calls authenticated mutation | No session; direct authenticated-only AppSync mutation. | Request rejected; no operation executed. | Security | Critical | ⚪ NOT RUN |
| SEC-AUTHZ-05 | Backend authorization | Client supplies another user's ID | Authenticate A; submit B identifier where applicable. | Backend uses trusted identity where required; client-controlled userId cannot grant B's data access. | Security | Critical | ⚪ NOT RUN |
| SEC-AUTHZ-06 | Backend authorization | Expired token + stale React auth | React still shows authenticated but token invalid; call protected backend. | Session refreshes if supported or request rejected; stale React state does not authorize. | Security | Critical | ⚪ NOT RUN |
| SEC-AUTHZ-07 | Backend authorization | Removed ADMIN + stale UI | ADMIN membership removed but UI temporarily stale; call admin backend. | Current backend authorization wins; stale UI grants nothing. | Security | Critical | ⚪ NOT RUN |
| COST-AUTH-01 | Cost / Performance | Normal AuthProvider mount | Mount application and observe auth calls. | Only expected auth initialization; no repeated request loop. | Performance / Cost | High | ⚪ NOT RUN |
| COST-AUTH-02 | Cost / Performance | Rerender does not refresh auth | Trigger unrelated rerenders. | refreshAuth not repeated on each rerender. | Performance / Cost | High | ⚪ NOT RUN |
| COST-AUTH-03 | Cost / Performance | Many useAuth consumers | Render Navbar, LegalGuard, AdminGuard, Account using useAuth. | All reuse Context; no duplicate Cognito session calls per consumer. | Performance / Architecture | Normal | ⚪ NOT RUN |
| COST-LEGAL-01 | Cost / Performance | Legal cache prevents repeated checks | Verified user navigates repeatedly between protected routes. | No unnecessary repeated backend legal checks. | Performance / Cost | High | ⚪ NOT RUN |
| COST-LEGAL-02 | Cost / Performance | Legal error no retry storm | Force legal backend failures; observe request count. | No uncontrolled retries or request flood. | Cost-abuse / Failure | Critical | ⚪ NOT RUN |
| COST-LEGAL-03 | Cost / Performance | Legal redirect no loop | User requiring legal acceptance enters protected route. | Redirect terminates; no protected/auth loop. | Cost-abuse / Regression | Critical | ⚪ NOT RUN |
| COST-LEGAL-04 | Cost / Performance | Rapid route changes | Rapidly switch protected routes during unresolved legal verification. | Stale effects ignored; no uncontrolled legal-check flood; bounded request volume. | Performance / Cost | High | ⚪ NOT RUN |
| LEGAL-DATA-01 | legal-acceptance.ts | Normal user reads only own legal acceptances | Authenticate as User A; call getLegalUpdateRequirement(). | Only User A legal records are considered; no foreign records are exposed. | Security / Integration | Critical | ⚪ NOT RUN |
| LEGAL-DATA-02 | legal-acceptance.ts | Manual foreign userId request | Authenticate as User A; manually craft AppSync request filtering for User B. | Backend authorization prevents reading User B records. | Security | Critical | ⚪ NOT RUN |
| LEGAL-DATA-03 | legal-acceptance.ts | Pagination over 100 records | Prepare >100 matching legal records and execute getLegalUpdateRequirement(). | Function follows nextToken correctly and evaluates all required pages until early success/end. | Integration | High | ⚪ NOT RUN |
| LEGAL-DATA-04 | legal-acceptance.ts | Terms on page 1, Privacy on page 2 | Prepare current Terms record on first page and current Privacy record on second. | Returns `none`; pagination combines findings across pages correctly. | Integration | High | ⚪ NOT RUN |
| LEGAL-DATA-05 | legal-acceptance.ts | AppSync list errors | Make LegalAcceptance.list return GraphQL errors. | Function throws; LegalAccessGuard treats it fail-closed. | Failure / Integration | Critical | ⚪ NOT RUN |
| LEGAL-DATA-06 | legal-acceptance.ts | Empty legal history | No legal acceptance records for current user. | Returns `both`. | Unit / Integration | High | ⚪ NOT RUN |
| LEGAL-DATA-07 | legal-acceptance.ts | Only current Terms exists | Current Terms accepted; current Privacy not accepted. | Returns `privacy`. | Unit / Integration | High | ⚪ NOT RUN |
| LEGAL-DATA-08 | legal-acceptance.ts | Only current Privacy exists | Current Privacy accepted; current Terms not accepted. | Returns `terms`. | Unit / Integration | High | ⚪ NOT RUN |
| LEGAL-DATA-09 | legal-acceptance.ts | Current Terms and Privacy in separate records | Current Terms appears in one record and current Privacy in another. | Current code returns `none`; final legal audit must confirm this semantics is intended. | Legal / Architecture | High | 🟡 OPEN |
| LEGAL-DATA-10 | legal-acceptance.ts | Repeated pagination token | Backend returns the same truthy nextToken again. | Function detects repeated token, throws, and stops; no infinite loop. | Failure / Cost-abuse | Critical | ⚪ NOT RUN |
| LEGAL-DATA-11 | legal-acceptance.ts | Pagination token cycle | Backend returns token sequence A -> B -> A. | Function detects previously seen token and aborts fail-closed. | Failure / Cost-abuse | Critical | ⚪ NOT RUN |
| LEGAL-DATA-12 | legal-acceptance.ts | Excessive unique pagination | Backend continuously returns new unique tokens. | Function sends at most MAX_LEGAL_ACCEPTANCE_PAGES requests, then throws before another request. | Failure / Cost-abuse | Critical | ⚪ NOT RUN |
| LEGAL-DATA-13 | legal-acceptance.ts | Normal pagination regression | Backend returns A -> B -> null. | Function completes normally; pagination guard causes no regression. | Integration | High | ⚪ NOT RUN |
| LEGAL-DATA-14 | legal-acceptance.ts | Early return avoids unnecessary page | Current Terms and Privacy both found before all pages are consumed. | Returns `none` immediately; later pages are not requested. | Performance / Cost | High | ⚪ NOT RUN |
| LEGAL-WRITE-01 | legal-acceptance.ts | acceptCurrentLegal success | Custom mutation returns data=true and no errors. | Function resolves successfully. | Integration | High | ⚪ NOT RUN |
| LEGAL-WRITE-02 | legal-acceptance.ts | Mutation returns false | Custom mutation returns data=false. | Function throws; UI must not treat acceptance as saved. | Integration | High | ⚪ NOT RUN |
| LEGAL-WRITE-03 | legal-acceptance.ts | Mutation returns GraphQL errors | Custom mutation returns errors. | Function throws; acceptance is not treated as successful. | Failure / Integration | Critical | ⚪ NOT RUN |
| LEGAL-WRITE-04 | legal-acceptance.ts | Arbitrary terms/privacy version tampering | Attacker bypasses frontend and sends arbitrary versions to custom mutation. | Backend validates/normalizes against trusted current versions; forged version is not accepted. | Security / Validation | Critical | 🟡 OPEN |
| LEGAL-WRITE-05 | legal-acceptance.ts | Accept documents for another user | Attacker attempts to submit another user's identity/acceptance. | Backend derives caller identity from trusted auth context and cannot write acceptance for another user. | Security / Authorization | Critical | 🟡 OPEN |

## Open audit points

The following items are intentionally not marked as passing yet:

1. `SEC-AUTHZ-03` — final backend/legal rules for bypassing `LegalAccessGuard` must be defined and verified.
2. `LEGAL-DATA-09` — confirm during legal audit whether current Terms and current Privacy may be satisfied by separate historical acceptance records.
3. `LEGAL-WRITE-04` — inspect the backend `acceptCurrentLegal` resolver/Lambda to verify trusted validation of document versions.
4. `LEGAL-WRITE-05` — inspect the backend `acceptCurrentLegal` resolver/Lambda to verify caller identity is derived from trusted auth context.
5. `LEGAL-DATA-01/02` — inspect `amplify/data/resource.ts` to verify `LegalAcceptance` owner authorization prevents cross-user reads.
6. Confirm whether `LegalAcceptance.list(filter: userId)` maps to an efficient access pattern or a broader list/scan pattern; optimize after inspecting the schema/indexes.

## Production acceptance rule

Before production launch:

- all `Critical` tests must be executed and pass;
- all backend authorization regression tests must pass;
- all auth/logout/account-switch race-condition tests must pass;
- all legal fail-closed tests must pass;
- pagination must be bounded and resistant to repeated/cyclic tokens;
- open legal/backend authorization questions must be resolved;
- no known fail-open path may remain for security-critical operations;
- no uncontrolled request/retry/pagination loop may remain;
- final IAM review must confirm least privilege;
- cost-abuse scenarios must have bounded request behavior.

## Review note

This file is intentionally incomplete for the whole platform. It contains **all test cases created so far** from the audited files listed above. New sections/tests should be appended as the remaining application files and runtime flows are reviewed.