# EventHub — Booking Management Test Strategy

Generated: 2026-08-21
Input: `docs/test-scenarios.md` (68 scenarios, TC-001–TC-513, Booking Management scope)
Existing tests reviewed: `tests/booking-management.spec.js` (5 E2E tests), `backend/src/services/__tests__/bookingService.test.js` (8 unit tests, new), `frontend/app/bookings/[id]/__tests__/RefundEligibility.test.tsx` + `frontend/app/events/[id]/__tests__/BookingForm.test.tsx` (11 component tests, new)

---

## 1. Infrastructure (updated)

A prior pass through this plan found that only Playwright existed, so Unit and Component were "deferred" layers with no runner. That's no longer true — both were added and proven out with real, passing tests:

| Layer | Runner | Status |
|---|---|---|
| E2E | Playwright, page-driven | ✅ existing, `tests/booking-management.spec.js` |
| API | Playwright `request` fixture | ✅ available, not yet used by any spec file |
| Unit | **Jest** (`backend/package.json`, `npm run test` → `jest`) | ✅ added — `backend/src/services/__tests__/bookingService.test.js`, 8/8 passing |
| Component | **Vitest + React Testing Library** (`frontend/vitest.config.ts`, `npm run test` → `vitest run`) | ✅ added — 2 spec files, 11/11 passing |

Root convenience scripts: `npm run test` (Playwright E2E, unchanged), `npm run test:unit` (→ backend Jest), `npm run test:component` (→ frontend Vitest).

**One structural constraint discovered while wiring this up**: Next.js App Router's typed-routes checking restricts `page.tsx` files to a fixed set of reserved exports (`default`, `metadata`, `generateStaticParams`, …) — adding `export function Foo` for a testable sub-component inside a `page.tsx` fails `tsc --noEmit`. Fix used here: extract the component into a sibling file in the same route folder (not named `page`/`layout`/`route`, so Next.js doesn't apply the constraint) and import it back into the page. Two extractions were needed:
- `frontend/app/bookings/[id]/page.tsx` → `RefundEligibility` moved to `frontend/app/bookings/[id]/RefundEligibility.tsx`
- `frontend/app/events/[id]/page.tsx` → `BookingForm` (plus its private `BookingConfirmation`/`Row` helpers) moved to `frontend/app/events/[id]/BookingForm.tsx`

Behavior is unchanged (verified via `tsc --noEmit` and the existing E2E suite's assumptions about rendered markup/selectors — nothing in the DOM output changed). Anyone testing another page-embedded component in this codebase will hit the same wall and should use the same pattern.

---

## 2. Distribution Table (current state)

| Layer | Count | Implemented now | Focus |
|---|---|---|---|
| Unit (Jest) | 3 | **3/3** ✅ | Pure business logic reachable only by mocking repositories: `randomRef` prefix, price arithmetic, `generateUniqueRef` retry/fallback |
| API (Playwright `request`) | 30 | 0 — infra exists, no spec file written yet | Business rules, validation, security/auth, error contracts |
| Component (Vitest+RTL) | 16 | **7/16** ✅ (9 remain) | Isolated UI state: refund timer, ticket stepper, transient button states, loading/empty states |
| E2E (Playwright `page`) | 22 primary | 5/22 (existing suite) | Critical multi-page journeys, UI states not reachable via API |

This is now genuinely wide-at-the-bottom: Unit is fully covered, Component is nearly half covered, and the remaining gap (API layer — 30 scenarios, 0 implemented) is the single biggest opportunity, unchanged from the prior pass.

---

## 3. What's Implemented Now

### 3.1 Unit — `backend/src/services/__tests__/bookingService.test.js` (8 tests)

All three unit-ideal scenarios are tested by calling the real `bookingService.createBooking` with `bookingRepository`, `eventRepository`, and the Prisma client mocked out (`jest.mock`) — no database, no HTTP, sub-second run time.

| ID | Scenario | Test cases |
|---|---|---|
| TC-102 (+ TC-408 boundary) | Booking ref prefix = event title's first char, uppercased | 3 parameterized cases: letter title, digit-leading title, lowercase title |
| TC-106 | totalPrice = price × quantity | 3 parameterized price/quantity pairs, including a free (`price: 0`) event |
| TC-405 | `generateUniqueRef` collision retry / 10-attempt timestamp fallback | 2 tests: succeeds after 2 forced collisions (asserts `findByRef` called exactly 3 times); falls back to a timestamp-based ref after exactly 10 forced collisions |

### 3.2 Component — two Vitest + RTL spec files (11 tests)

**`frontend/app/bookings/[id]/__tests__/RefundEligibility.test.tsx`** (6 tests, fake timers via `vi.useFakeTimers()`):
TC-508 (idle state / button hidden after check starts), TC-105 (spinner appears immediately, still visible at 3.9s), TC-103 (quantity=1 eligible at 4s), TC-104 (quantity=3 ineligible, shows count), TC-404 (quantity=2 boundary, ineligible).

**`frontend/app/events/[id]/__tests__/BookingForm.test.tsx`** (5 tests, rendered via a `frontend/test-utils/render.tsx` helper that wraps `QueryClientProvider` + `ToastProvider` since `BookingForm` calls `useCreateBooking`/`useToast` unconditionally):
TC-402 (decrement disabled at quantity=1), TC-403 (increment caps at 10 when seats ≥ 10), TC-110/TC-409 (increment caps at `availableSeats` when scarce — tested at 3 seats and again at the 1-seat boundary), TC-410 (sold-out event shows "Sold Out" and disables submit).

### 3.3 Still deferred (9 of the original 16 Component scenarios)

TC-009 (admin "View" modal), TC-109 (clear-all link visibility — low value, cheap to just assert inline in an E2E test instead), TC-308 (server-error state — candidate for `msw`-style fetch mocking at component level), TC-500/TC-502 (loading skeleton/spinner — timing-sensitive, currently only verifiable via throttled E2E), TC-507 (bookings-list "Clearing…" transient button text), TC-511/TC-512/TC-513 (admin bookings table loading/error/empty states, filter-resets-page behavior, cancel-dialog wording).

None of these are blocked by missing infrastructure anymore — they just haven't been written yet. TC-511/512/513 need the same page.tsx-export workaround as above if `AdminBookingsPage`'s sub-components get extracted for testing, or alternatively test `AdminBookingsPage` as a whole with the same provider wrapper used for `BookingForm`.

---

## 4. Layer Assignments — API (30 scenarios, next priority)

Unchanged from the prior pass — this is still the biggest gap. No `tests/*.spec.js` file uses Playwright's `request` fixture yet; every one of these 30 scenarios currently has zero coverage anywhere in the repo.

| ID | Scenario | Source |
|---|---|---|
| TC-007 | Lookup booking by reference | `bookingController.getBookingByRef`, `bookingRoutes.js` |
| TC-100 | FIFO — 10th booking prunes oldest from different event | `bookingService.createBooking`, `bookingRepository.findOldestUserBookingExcludingEvent` |
| TC-101 | FIFO — same-event fallback burns a seat | `bookingService.createBooking` (`sameEventFallback` branch) |
| TC-106 | totalPrice = price × quantity (API contract twin of the unit test) | `bookingService.createBooking` |
| TC-107 | Default page size = 10 | `bookingService.getBookings` |
| TC-108 | Cancel releases computed seats (dynamic events) | `bookingService.cancelBooking` + `GET /api/events/:id` |
| TC-111 | Admin "Cancelled" filter always empty (hard-delete, no status update) | `bookingService.cancelBooking`, `bookingRepository.findAll` |
| TC-112 | Client-supplied `status` field ignored on create | `bookingService.createBooking` |
| TC-201 | Cross-user GET booking → 403 | `bookingService.getBookingById` |
| TC-202 | Cross-user DELETE booking → 403 | `bookingService.cancelBooking` |
| TC-203 | Unauthenticated GET /api/bookings → 401 | `authMiddleware` |
| TC-204 | Unauthenticated GET /api/bookings/:id → 401 | `authMiddleware` |
| TC-205 | Unauthenticated DELETE /api/bookings → 401 | `authMiddleware` |
| TC-206 | Cross-user GET by ref → 403 | `bookingService.getBookingByRef` |
| TC-207 | Admin page scoped to own user only, no bypass | `bookingRepository.findAll` (`where: { userId }`) |
| TC-301 | GET nonexistent booking → 404 | `bookingService.getBookingById` |
| TC-302 | Insufficient seats → 400 | `bookingService.createBooking` (`InsufficientSeatsError`) |
| TC-303 | Booking for nonexistent event → 404 | `bookingService.createBooking` |
| TC-304 | Missing required fields → 400 | `bookingValidator.validateCreateBooking` |
| TC-305 | quantity 0 / negative → 400 | `bookingValidator` |
| TC-306 | quantity > 10 → 400 | `bookingValidator` |
| TC-307 | Cancel already-cancelled booking → 404 | `bookingService.cancelBooking` |
| TC-309 | Invalid phone characters → 400 | `bookingValidator` (regex) |
| TC-310 | Invalid email format → 400 | `bookingValidator` (`.isEmail()`) |
| TC-400 | FIFO different-event boundary (dup of 100, exact-9 framing) | same as TC-100 |
| TC-401 | FIFO same-event boundary (dup of 101, exact-9 framing) | same as TC-101 |
| TC-406 | Clear all with exactly 1 booking → `{ deleted: 1 }` | `bookingService.clearAllBookings` |
| TC-407 | Pagination page 2 partial results | `bookingService.getBookings` |
| TC-408 | Digit-prefixed event title → ref uses digit as-is (API contract twin of the unit test) | `randomRef` (via API response) |
| TC-411 | Booking exactly the last remaining seat succeeds; next unit fails | `bookingService.createBooking` (`personalAvailable < quantity`) |

---

## 5. Layer Assignments — E2E (22 primary scenarios)

Unchanged from the prior pass; `tests/booking-management.spec.js` already covers 5 of these (TC-001–004, TC-006, TC-102 — see §6 anti-pattern note on TC-102). Remaining 17 are TC-005, TC-008, TC-009, TC-200, TC-300, TC-308, TC-311, TC-402, TC-403, TC-409, TC-410, TC-501, TC-503, TC-504, TC-505, TC-506, TC-510 — see the previous version of this document (recoverable via `git log -- docs/test-strategy.md` if needed) for the per-scenario source/rationale table; nothing here changed.

---

## 6. Anti-Patterns & Notes Carried Forward

1. **TC-102 is still tested only at E2E** in `tests/booking-management.spec.js` (full login→browse→book flow to check a string prefix) even though it's now *also* covered properly at the Unit layer (§3.1). The E2E version isn't wrong — it's useful as an integration smoke test — but it shouldn't be the *only* place this rule is verified, and it no longer needs to be, since the unit test now owns the actual logic-correctness question. Consider trimming the E2E assertion to just "a ref exists and looks well-formed" rather than re-deriving the exact prefix rule.
2. **The API layer is still the single biggest gap** — unchanged from the prior pass. 30 scenarios, including every security/auth check and every validation rule, have zero coverage. This remains the highest-value next step.
3. **`clearBookings()` test helper risk** (from the prior pass) still applies — if TC-311's suspected silent-failure bug in the "Clear all bookings" button is real, every E2E test relying on that helper for setup inherits the risk. Worth a manual check before writing more E2E tests on top of it.
4. **CI is not yet wired to the new runners.** `npm run test:unit` / `npm run test:component` exist and pass locally, but `.github/workflows/ci.yml` doesn't call them — right now they'd only run if a developer remembers to run them by hand. Worth a follow-up if this project wants the new layers enforced automatically.

---

## 7. Consolidated Summary — All Scenarios, One Table

Every scenario in `docs/test-scenarios.md`, collapsed to a single flat table (ID, short title, assigned layer(s)). This doesn't replace §4–§5 above — those keep the full source-file references and contested-assignment rationale — it's a quick-scan index. **✅ = a real, passing automated test exists for this scenario today**; no mark = planned but not yet written.

| ID | Title | Layer | |
|---|---|---|---|
| TC-001 | View bookings list | E2E | ✅ |
| TC-002 | View booking detail page | E2E | ✅ |
| TC-003 | Cancel booking from detail page | E2E | ✅ |
| TC-004 | Clear all bookings | E2E | ✅ |
| TC-005 | Back-to-list navigation | E2E | |
| TC-006 | "View My Bookings" navigation | E2E | ✅ |
| TC-007 | Lookup booking by reference | API | |
| TC-008 | Admin bookings table view | E2E | |
| TC-009 | Admin "View" modal | E2E (Component-ideal) | |
| TC-100 | FIFO — prune oldest, different event | API | |
| TC-101 | FIFO — same-event fallback burns seat | API | |
| TC-102 | Booking ref prefix = event title char | Unit + E2E | ✅ |
| TC-103 | Refund eligible — qty = 1 | Component | ✅ |
| TC-104 | Refund ineligible — qty > 1 | Component | ✅ |
| TC-105 | Refund spinner ~4s timing | Component | ✅ |
| TC-106 | Total price = price × quantity | Unit + API | ✅ |
| TC-107 | Default page size = 10 | API | |
| TC-108 | Cancel releases seats (dynamic events) | API | |
| TC-109 | "Clear all" link visibility | E2E (Component-ideal) | |
| TC-110 | Stepper capped at available seats | Component | ✅ |
| TC-111 | Admin "Cancelled" filter always empty | API | |
| TC-112 | Client-supplied status ignored | API | |
| TC-200 | Cross-user 403 — "Access Denied" UI | E2E + API (twin: TC-201) | |
| TC-201 | Cross-user GET booking → 403 | API | |
| TC-202 | Cross-user DELETE booking → 403 | API | |
| TC-203 | No auth GET list → 401 | API | |
| TC-204 | No auth GET detail → 401 | API | |
| TC-205 | No auth DELETE clear-all → 401 | API | |
| TC-206 | Cross-user lookup by ref → 403 | API | |
| TC-207 | Admin page scoped to own user only | API | |
| TC-300 | Non-existent booking → "not found" UI | E2E + API (twin: TC-301) | |
| TC-301 | GET non-existent booking → 404 | API | |
| TC-302 | Insufficient seats → 400 | API | |
| TC-303 | Booking for non-existent event → 404 | API | |
| TC-304 | Missing required fields → 400 | API | |
| TC-305 | quantity 0/negative → 400 | API | |
| TC-306 | quantity > 10 → 400 | API | |
| TC-307 | Cancel already-cancelled → 404 | API | |
| TC-308 | Server-down error state | E2E (Component-ideal) | |
| TC-309 | Invalid phone characters → 400 | API | |
| TC-310 | Invalid email format → 400 | API | |
| TC-311 | "Clear all" silent-failure bug repro | E2E | |
| TC-400 | FIFO different-event boundary (exact 9) | API | |
| TC-401 | FIFO same-event boundary (exact 9) | API | |
| TC-402 | quantity = 1 minimum journey | E2E + Component | ✅ |
| TC-403 | quantity = 10 maximum journey | E2E + Component | ✅ |
| TC-404 | Refund boundary — qty = 2 | Component | ✅ |
| TC-405 | Booking ref collision retry/fallback | Unit | ✅ |
| TC-406 | Clear all with 1 booking | API | |
| TC-407 | Pagination page 2 partial results | API | |
| TC-408 | Digit-prefixed title → ref uses digit | API + Unit | ✅ |
| TC-409 | Stepper collapses below 10 (scarce seats) | Component | ✅ |
| TC-410 | Sold-out disables booking form | Component | ✅ |
| TC-411 | Book exact last remaining seat | API | |
| TC-500 | Skeleton loading state (list) | Component | |
| TC-501 | Empty state — no bookings | E2E | |
| TC-502 | Loading spinner (detail page) | Component | |
| TC-503 | Cancel confirmation dialog appears | E2E | |
| TC-504 | Dismiss dialog does not cancel | E2E | |
| TC-505 | Breadcrumb shows booking ref | E2E | |
| TC-506 | Cancel success — toast + redirect | E2E | |
| TC-507 | "Clearing…" transient button state | Component | |
| TC-508 | Check-eligibility button hidden after result | Component | ✅ |
| TC-509 | "Access Denied" state for 403 | E2E | |
| TC-510 | Pagination UI renders (multi-page) | E2E | |
| TC-511 | Admin table loading/error/empty states | Component | |
| TC-512 | Admin filter resets to page 1 | E2E (Component-ideal) | |
| TC-513 | Admin cancel dialog wording | E2E | |

**Tally**: 68 scenarios total — 19 ✅ implemented (3 Unit, 10 Component, 6 E2E-covered-by-existing-suite) / 49 planned. By layer: Unit 3 (3 ✅), API 30 (0 ✅), Component 16 (7 ✅), E2E 22 primary (5 ✅, plus 3 more sharing a ✅ with Unit/Component rows above).
