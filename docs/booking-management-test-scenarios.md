# EventHub — Booking Management Test Scenarios

Generated: 2026-08-21
Scope: Booking Management (view, create, cancel, clear-all, refund eligibility, admin booking management)

---

## Happy Path

### TC-001: View bookings list with existing bookings
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one confirmed booking
**Steps**:
1. Navigate to `/bookings`
2. Observe the list of booking cards rendered
**Expected Results**: Each booking card displays booking reference, status badge, booking ID, event name, date, quantity, city, total price, and "View Details" / "Cancel Booking" actions
**Business Rule**: Flow 4 — Manage Bookings
**Suggested Layer**: E2E

---

### TC-002: View single booking detail page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one confirmed booking
**Steps**:
1. Navigate to `/bookings`
2. Click "View Details" on any booking card
3. Observe the booking detail page at `/bookings/:id`
**Expected Results**: Page shows event details (title, category, date, venue, city), customer details (name, email, phone), payment summary (tickets, price per ticket, total paid), booking reference in breadcrumb and header, booking ID, "Booked on" date, and "Check eligibility for refund?" link
**Business Rule**: Booking model fields; Flow 4
**Suggested Layer**: E2E

---

### TC-003: Cancel a single booking from the detail page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one confirmed booking
**Steps**:
1. Navigate to `/bookings/:id`
2. Click "Cancel Booking" button
3. Confirm in the dialog by clicking "Yes, cancel it"
4. Observe redirect and bookings list
**Expected Results**: Success toast "Booking cancelled successfully" appears; user is redirected to `/bookings`; cancelled booking no longer appears in the list
**Business Rule**: Booking cancellation permanently deletes the record (hard delete, not a status change); seats released for dynamic events
**Suggested Layer**: E2E

---

### TC-004: Clear all bookings from the bookings list page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one booking
**Steps**:
1. Navigate to `/bookings`
2. Click "Clear all bookings" link
3. Confirm the browser `confirm()` dialog
4. Observe the page after clearing
**Expected Results**: All bookings are removed; page shows empty state "No bookings yet" with "Browse Events" button; `DELETE /api/bookings` is called with the user's JWT and returns `{ deleted: N }`
**Business Rule**: `DELETE /api/bookings` clears all bookings for the authenticated user; `clearAllBookings` service method
**Suggested Layer**: E2E
**Note**: See TC-311 — the current frontend wiring for this button has a known defect that can make this scenario fail; keep this test as the source of truth for intended behavior.

---

### TC-005: Navigate back to bookings list from detail page
**Category**: Happy Path
**Priority**: P2
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "← Back to My Bookings" button at bottom of detail page
**Expected Results**: User is navigated to `/bookings`
**Business Rule**: UI navigation flow
**Suggested Layer**: E2E

---

### TC-006: Navigate to bookings via "View My Bookings" after completing a booking
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User just completed a booking (confirmation card shown)
**Steps**:
1. After booking confirmation, click "View My Bookings" link
2. Observe the bookings page
**Expected Results**: User lands on `/bookings` and the newly created booking appears in the list
**Business Rule**: Flow 3 → Flow 4 navigation
**Suggested Layer**: E2E

---

### TC-007: Lookup booking by reference via API
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User is authenticated; user has a booking with known `bookingRef`
**Steps**:
1. Send `GET /api/bookings/ref/:ref` with valid JWT and own booking ref
**Expected Results**: 200 response with full booking data including nested event
**Business Rule**: `GET /api/bookings/ref/:ref` endpoint
**Suggested Layer**: API

---

### TC-008: Admin — view all own bookings in "Manage Bookings" table
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User is logged in; user has at least one booking
**Steps**:
1. Navigate to `/admin/bookings`
2. Observe the bookings table
**Expected Results**: Table renders columns Ref, Customer, Event, Qty, Total, Status, Date, Actions; header shows total booking count; rows match the user's own bookings
**Business Rule**: `AdminBookingsPage` renders `useBookings` results in a table view
**Suggested Layer**: E2E

---

### TC-009: Admin — view booking detail via "View" modal
**Category**: Happy Path
**Priority**: P2
**Preconditions**: User is on `/admin/bookings` with at least one booking row
**Steps**:
1. Click "View" on any row
2. Observe the modal
**Expected Results**: `BookingModal` opens showing reference, status, event (title/date/city), customer (name/email/phone), tickets, total, and booked-on date; closing the modal returns to the table
**Business Rule**: `BookingModal` component in `AdminBookingsPage`
**Suggested Layer**: Component / E2E

---

## Business Rules

### TC-100: FIFO pruning — 10th booking replaces oldest booking from a different event
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has exactly 9 bookings (all for different events); user has JWT token
**Steps**:
1. Note the oldest booking ID
2. Create a new booking (10th) for a different event via `POST /api/bookings`
3. Retrieve all user bookings
**Expected Results**: Total booking count remains 9; the oldest booking is deleted; the new booking is present
**Business Rule**: Max 9 bookings per user; FIFO pruning prefers deleting from a different event (`findOldestUserBookingExcludingEvent`)
**Suggested Layer**: API

---

### TC-101: FIFO pruning — same-event fallback permanently burns a seat
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has exactly 9 bookings all for the SAME event; enough seats remain
**Steps**:
1. Create a 10th booking for the same event
2. Retrieve the event's available seats
**Expected Results**: Oldest booking is deleted; new booking is created; `availableSeats` is decremented by the new booking's quantity (seat permanently burned via `eventRepository.decrementSeats`)
**Business Rule**: `sameEventFallback` path in `bookingService.createBooking`
**Suggested Layer**: API

---

### TC-102: Booking reference first character matches event title first character
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User is logged in; event with known title exists (e.g., "Tech Conference Bangalore")
**Steps**:
1. Book the event
2. Read the `bookingRef` from the confirmation card or API response
**Expected Results**: `bookingRef` starts with the uppercase first character of the event title, followed by `-` and 6 random alphanumeric characters (e.g., "T-A3B2C1")
**Business Rule**: `randomRef` function: prefix = `eventTitle[0].toUpperCase()`
**Suggested Layer**: E2E / API

---

### TC-103: Refund eligibility — single ticket booking is eligible
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has a booking with quantity = 1
**Steps**:
1. Navigate to `/bookings/:id` for the single-ticket booking
2. Click "Check eligibility for refund?"
3. Wait for spinner to disappear (4 seconds)
4. Read the refund result
**Expected Results**: `[data-testid=refund-result]` shows green "Eligible for refund. Single-ticket bookings qualify for a full refund."
**Business Rule**: quantity === 1 → eligible (frontend-only logic, no backend endpoint)
**Suggested Layer**: E2E

---

### TC-104: Refund eligibility — multi-ticket booking is NOT eligible
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has a booking with quantity > 1 (e.g., 3 tickets)
**Steps**:
1. Navigate to `/bookings/:id` for the multi-ticket booking
2. Click "Check eligibility for refund?"
3. Wait for spinner to disappear (4 seconds)
4. Read the refund result
**Expected Results**: `[data-testid=refund-result]` shows red "Not eligible for refund. Group bookings (3 tickets) are non-refundable." with correct quantity displayed
**Business Rule**: quantity > 1 → not eligible
**Suggested Layer**: E2E

---

### TC-105: Refund eligibility spinner shows for approximately 4 seconds
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "Check eligibility for refund?"
2. Immediately check for spinner
3. Observe when spinner disappears and result appears
**Expected Results**: `[data-testid=refund-spinner]` is visible immediately after clicking; spinner disappears and `[data-testid=refund-result]` appears after ~4 seconds (`setTimeout(..., 4000)`)
**Business Rule**: `RefundEligibility` component timing
**Suggested Layer**: E2E / Component

---

### TC-106: Total price is calculated as price × quantity
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User books an event with known price
**Steps**:
1. Book an event (e.g., price $1499, quantity 3)
2. View the booking detail page
**Expected Results**: "Total Paid" shows $4,497 (1499 × 3); `totalPrice` in API response equals `event.price × quantity`
**Business Rule**: `totalPrice = event.price × quantity`
**Suggested Layer**: E2E / API

---

### TC-107: Bookings API defaults to 10 items per page
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `GET /api/bookings` with no `page`/`limit` query params
**Expected Results**: Response includes `pagination.page = 1`, `pagination.limit = 10`, and `data` array with at most 10 items
**Business Rule**: `bookingService.getBookings` — `Number(filters.limit) || 10`
**Suggested Layer**: API

---

### TC-108: Cancelling a booking releases seat count for dynamic events (computed)
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has a dynamic (user-created) event with a booking
**Steps**:
1. Note the current available seats for the event (computed: `totalSeats - sum(user's booking quantities)`)
2. Cancel the booking for that event
3. Re-fetch the event detail
**Expected Results**: Available seats increase by the cancelled booking's quantity
**Business Rule**: Dynamic events compute seats on read; cancellation removes the booking record, so the sum used in the computation drops
**Suggested Layer**: API / E2E

---

### TC-109: "Clear all bookings" link is visible whenever bookings exist
**Category**: Business Rule
**Priority**: P2
**Preconditions**: User has at least one booking
**Steps**:
1. Navigate to `/bookings`
2. Look for "Clear all bookings" link
**Expected Results**: "Clear all bookings" link is visible in the top-right of the page header, with helper text "Do this often for clean test data."
**Business Rule**: Flow 4 — UI always shows clear option when bookings exist
**Suggested Layer**: E2E / Component

---

### TC-110: Ticket stepper is capped at the lower of 10 or the event's available seats
**Category**: Business Rule
**Priority**: P1
**Preconditions**: An event has fewer than 10 seats remaining (e.g., 3 available)
**Steps**:
1. Navigate to the event's detail page
2. Click "+" repeatedly on the ticket stepper
**Expected Results**: Stepper stops incrementing at 3 (not 10); "+" button becomes disabled; helper text reads "(max 3)"
**Business Rule**: `maxQty = Math.min(10, event.availableSeats)` in `BookingForm`
**Suggested Layer**: E2E / Component

---

### TC-111: Admin bookings "Cancelled" status filter never returns results
**Category**: Business Rule
**Priority**: P2
**Preconditions**: User is on `/admin/bookings`; user has cancelled at least one booking previously
**Steps**:
1. Select "Cancelled" from the status filter dropdown
**Expected Results**: List is empty — because cancellation hard-deletes the booking row rather than setting `status = "cancelled"`, no booking can ever match this filter
**Business Rule**: `bookingService.cancelBooking` calls `bookingRepository.delete`, never updates `status`; `status` is always `"confirmed"` at creation and stays that way until the row is deleted
**Suggested Layer**: API / E2E

---

### TC-112: Client-supplied `status` field is ignored on booking creation
**Category**: Business Rule
**Priority**: P2
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with a valid payload plus an extra `status: "cancelled"` field
**Expected Results**: Booking is created with `status: "confirmed"` regardless of the supplied value
**Business Rule**: `bookingService.createBooking` hardcodes `status: 'confirmed'`; the validator does not accept a `status` field at all
**Suggested Layer**: API

---

## Security

### TC-200: Cross-user booking access returns "Access Denied" (UI)
**Category**: Security
**Priority**: P0
**Preconditions**: Two test accounts exist (rahulshetty1@gmail.com and rahulshetty1@yahoo.com); User A has a booking
**Steps**:
1. Log in as User A, create a booking, note the booking ID
2. Log out (clear localStorage JWT)
3. Log in as User B
4. Navigate to `/bookings/:userA_booking_id`
**Expected Results**: Page shows "Access Denied" title and "You are not authorized to view this booking." description
**Business Rule**: Cross-user access returns 403; frontend renders "Access Denied" on 403 response
**Suggested Layer**: E2E

---

### TC-201: Cross-user booking access returns 403 via API
**Category**: Security
**Priority**: P0
**Preconditions**: User A has a booking; User B has a valid JWT
**Steps**:
1. Send `GET /api/bookings/:userA_booking_id` with User B's JWT
**Expected Results**: HTTP 403; response body contains "You are not authorized to view this booking"
**Business Rule**: `bookingService.getBookingById` — `booking.userId !== userId` → ForbiddenError
**Suggested Layer**: API

---

### TC-202: Cross-user booking cancellation returns 403 via API
**Category**: Security
**Priority**: P0
**Preconditions**: User A has a booking; User B has a valid JWT
**Steps**:
1. Send `DELETE /api/bookings/:userA_booking_id` with User B's JWT
**Expected Results**: HTTP 403; booking is NOT deleted from the database
**Business Rule**: `bookingService.cancelBooking` — `booking.userId !== userId` → ForbiddenError
**Suggested Layer**: API

---

### TC-203: Unauthenticated access to bookings list returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `GET /api/bookings` without Authorization header
**Expected Results**: HTTP 401; "Unauthorized" error message
**Business Rule**: Auth middleware on all `/api/bookings` routes
**Suggested Layer**: API

---

### TC-204: Unauthenticated access to booking detail returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `GET /api/bookings/:id` without Authorization header
**Expected Results**: HTTP 401; "Unauthorized" error message
**Business Rule**: Auth middleware
**Suggested Layer**: API

---

### TC-205: Unauthenticated DELETE /api/bookings returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `DELETE /api/bookings` without Authorization header
**Expected Results**: HTTP 401
**Business Rule**: Auth middleware; `clearAllBookings` requires authenticated user
**Suggested Layer**: API

---

### TC-206: Cross-user booking lookup by ref returns 403
**Category**: Security
**Priority**: P1
**Preconditions**: User A has a booking with known ref; User B has a valid JWT
**Steps**:
1. Send `GET /api/bookings/ref/:userA_ref` with User B's JWT
**Expected Results**: HTTP 403; "You do not own this booking"
**Business Rule**: `bookingService.getBookingByRef` — ownership check
**Suggested Layer**: API

---

### TC-207: "Manage Bookings" admin page is not a true cross-user admin view
**Category**: Security
**Priority**: P1
**Preconditions**: Two test accounts exist; both have bookings
**Steps**:
1. Log in as User A and note their booking count on `/admin/bookings`
2. Log in as User B, who has a different set of bookings
3. Navigate to `/admin/bookings`
**Expected Results**: Each user only ever sees their own bookings on `/admin/bookings` — the endpoint it calls (`GET /api/bookings`) is scoped to `req.user.userId` server-side with no admin-role bypass, despite the page being named "Manage Bookings"
**Business Rule**: `bookingRepository.findAll` always filters `where: { userId }`; there is no admin role or privilege escalation path
**Suggested Layer**: API / E2E

---

## Negative / Error

### TC-300: Navigate to non-existent booking ID shows "Booking not found"
**Category**: Negative
**Priority**: P1
**Preconditions**: User is logged in
**Steps**:
1. Navigate to `/bookings/99999` (ID that does not exist)
**Expected Results**: Page shows "Booking not found" and "This booking doesn't exist or may have been cancelled." with "View My Bookings" button
**Business Rule**: `bookingService.getBookingById` throws NotFoundError → API returns 404; frontend renders not-found empty state
**Suggested Layer**: E2E

---

### TC-301: GET /api/bookings/:id with non-existent ID returns 404
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `GET /api/bookings/99999` with valid JWT
**Expected Results**: HTTP 404; error message "Booking with id 99999 not found"
**Business Rule**: `bookingService.getBookingById` — NotFoundError
**Suggested Layer**: API

---

### TC-302: Create booking with insufficient seats returns 400
**Category**: Negative
**Priority**: P0
**Preconditions**: User is authenticated; event has 0 personal available seats (all booked by this user)
**Steps**:
1. Send `POST /api/bookings` with `quantity: 1` for a fully-booked event
**Expected Results**: HTTP 400; "Only 0 seat(s) available, but 1 requested"
**Business Rule**: `bookingService.createBooking` — `InsufficientSeatsError` when `personalAvailable < quantity`
**Suggested Layer**: API

---

### TC-303: Create booking for non-existent event returns 404
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with `eventId: 99999`
**Expected Results**: HTTP 404; "Event with id 99999 not found"
**Business Rule**: `bookingService.createBooking` — event lookup fails → NotFoundError
**Suggested Layer**: API

---

### TC-304: Create booking with missing required fields returns 400
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with missing `customerName`, `customerEmail`, or `customerPhone`
**Expected Results**: HTTP 400; validation error message listing missing fields
**Business Rule**: `validateCreateBooking` validators on the bookings route
**Suggested Layer**: API

---

### TC-305: Create booking with quantity = 0 or negative returns 400
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with `quantity: 0`
2. Send `POST /api/bookings` with `quantity: -1`
**Expected Results**: HTTP 400; validation error for both cases
**Business Rule**: quantity must be an integer between 1 and 10
**Suggested Layer**: API

---

### TC-306: Create booking with quantity > 10 returns 400
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with `quantity: 11`
**Expected Results**: HTTP 400; validation error
**Business Rule**: quantity must be 1–10
**Suggested Layer**: API

---

### TC-307: Cancel a booking that has already been cancelled returns 404
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated; a booking exists
**Steps**:
1. Delete the booking via `DELETE /api/bookings/:id`
2. Attempt to delete the same booking again
**Expected Results**: HTTP 404; "Booking with id X not found"
**Business Rule**: `cancelBooking` uses `bookingRepository.findById` — not found after deletion
**Suggested Layer**: API

---

### TC-308: Bookings page shows error state when server is unreachable
**Category**: Negative
**Priority**: P2
**Preconditions**: Backend server is down or returns 500
**Steps**:
1. Navigate to `/bookings` with backend unavailable
**Expected Results**: Error empty state renders: "Couldn't load bookings", "Failed to connect to the server. Please try again.", and a "Retry" button
**Business Rule**: `isError` branch in `BookingsContent` component
**Suggested Layer**: Component / E2E

---

### TC-400: Booking quantity exactly 10 succeeds when seats allow it
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User is authenticated and an event has at least 10 seats remaining
**Steps**:
1. Navigate to the event detail page
2. Increase quantity to 10
3. Complete booking with valid customer details
**Expected Results**: Booking is created successfully with `quantity = 10` and total price reflects ten tickets; page shows confirmation and booking appears in `/bookings`
**Business Rule**: Quantity must be between 1 and 10; current event seat availability must still be at least 10 for the user to purchase the full max
**Suggested Layer**: E2E

---

### TC-401: Same user may book the same dynamic event more than once
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User owns a dynamic event and has enough personal seat allowance for repeated bookings
**Steps**:
1. Create a dynamic event with `totalSeats = 5`
2. Book the event once for quantity 2
3. Book the same event again for quantity 1
4. Retrieve booking list and event detail
**Expected Results**: Both bookings exist in the user's list; the event's computed available seats reflect the personal booking total rather than treating bookings as a single shared seat pool across all users
**Business Rule**: Dynamic events compute `availableSeats = totalSeats - sum(user booking quantities for that event)`; same-user repeat bookings are valid
**Suggested Layer**: API / E2E

---

### TC-402: Booking list pagination respects the 10-item default and next page
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User has more than 10 bookings
**Steps**:
1. Navigate to `/bookings`
2. Observe the first page of booking cards
3. Move to the next page if pagination controls are present
**Expected Results**: No more than 10 bookings are shown on the first page; pagination changes page state without duplicating or dropping entries across pages
**Business Rule**: `GET /api/bookings` defaults to `limit = 10`; the list pages in chunks of 10
**Suggested Layer**: E2E / API

---

### TC-500: Empty bookings state is shown when the user has no bookings
**Category**: UI State
**Priority**: P0
**Preconditions**: User is logged in and has cleared all bookings
**Steps**:
1. Navigate to `/bookings`
**Expected Results**: Empty-state message is displayed with a call to action such as "Browse Events" or similar; no booking cards appear; the clear-all action is hidden
**Business Rule**: Empty state for no-bookings flow; list should not crash when there are zero records
**Suggested Layer**: E2E

---

### TC-501: Loading state appears while bookings data is being fetched
**Category**: UI State
**Priority**: P1
**Preconditions**: User is logged in; network response is intentionally delayed
**Steps**:
1. Navigate to `/bookings`
2. Observe the page before the server responds
**Expected Results**: A loading or skeleton state is visible; no stale content is shown until data resolves; the component does not render an empty or broken list prematurely
**Business Rule**: UI should handle asynchronous fetches gracefully while waiting for backend data
**Suggested Layer**: Component / E2E

---

### TC-502: Cancel confirmation and success toast state on a booking card
**Category**: UI State
**Priority**: P1
**Preconditions**: User has at least one booking
**Steps**:
1. Navigate to `/bookings`
2. Click "Cancel Booking" on a booking card
3. Confirm the action
**Expected Results**: Confirm dialog appears; after confirmation, a success toast or inline notification shows that the booking was cancelled, and the card disappears from the list
**Business Rule**: Booking deletion is immediate and the UI must reflect the result without leaving stale state behind
**Suggested Layer**: E2E

---

### TC-503: Refund check resets and re-renders correctly for a second booking
**Category**: UI State
**Priority**: P2
**Preconditions**: User has two bookings with different quantities, both accessible from `/bookings/:id`
**Steps**:
1. Open a single-ticket booking detail page
2. Click "Check eligibility for refund?"
3. Wait for the result to appear
4. Navigate to a multi-ticket booking detail page and repeat the check
**Expected Results**: The result text updates to the correct message for each booking; a stale single-ticket result does not remain visible on the next booking detail page
**Business Rule**: Eligibility is computed on the client from the booking quantity; UI must not reuse stale refund results across pages
**Suggested Layer**: E2E / Component

---

### TC-504: Booking detail page shows access-denied state for cross-user URL access
**Category**: UI State
**Priority**: P0
**Preconditions**: User A has a booking; User B is logged in and attempts to view it
**Steps**:
1. Log in as User B
2. Navigate directly to User A's booking URL
**Expected Results**: UI renders the access-denied empty state with an explanatory message and a way to return to the user's own bookings list; no booking data is visible
**Business Rule**: Access Denied is shown when a 403 response is returned for an unauthorized booking lookup
**Suggested Layer**: E2E

---

### TC-309: Customer phone with invalid characters is rejected
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with `customerPhone: "call-me-maybe"` (letters instead of digits)
**Expected Results**: HTTP 400; validation error "Customer phone must contain only digits and +, -, spaces, or parentheses"
**Business Rule**: `customerPhone` regex `/^[0-9+\-\s()]+$/` in `validateCreateBooking`
**Suggested Layer**: API

---

### TC-310: Customer email with invalid format is rejected
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with `customerEmail: "not-an-email"`
**Expected Results**: HTTP 400; validation error "Customer email must be a valid email address"
**Business Rule**: `customerEmail` `.isEmail()` validator
**Suggested Layer**: API

---

### TC-311: "Clear all bookings" button fails silently (missing auth header on this code path)
**Category**: Negative
**Priority**: P0
**Preconditions**: User is logged in on `/bookings` with at least one booking; browser console/network tab is observable
**Steps**:
1. Click "Clear all bookings" and confirm the dialog
2. Observe the network request, button state, and booking list afterward
**Expected Results (as currently implemented — flag as a bug if confirmed)**: The outgoing `DELETE` request carries no `Authorization` header, so the backend returns 401; the button briefly shows "Clearing…" then reverts; no success or error toast is shown; the booking list is unchanged; the browser console shows an unhandled promise rejection
**Business Rule**: `frontend/app/bookings/page.tsx` imports `bookingsApi` from `@/lib/api/bookings` (the `fetch`-based `client.ts`, which never attaches the JWT from `localStorage`), while every other booking mutation (`useCreateBooking`, `useCancelBooking`, `useBookings`) goes through `@/lib/api/bookingsApi` (the axios-based `client.js`, which does attach it) — see CLAUDE.md's note on duplicate `.js`/`.ts` API modules
**Suggested Layer**: E2E / API
**Note**: This scenario exists to catch/confirm a discrepancy between the two API client modules found while reading the code; verify against the live site since behavior may have been fixed since this was written.

---

## Edge Cases

### TC-400: Exactly 9 bookings — adding a 10th prunes oldest from a DIFFERENT event (preferred)
**Category**: Edge Case
**Priority**: P0
**Preconditions**: User has exactly 9 bookings across multiple events
**Steps**:
1. Note the ID of the oldest booking (different event from the new booking's event)
2. Create a new (10th) booking for Event X
3. Check the bookings list
**Expected Results**: Count stays at 9; oldest booking (different event) is gone; new booking is present
**Business Rule**: `findOldestUserBookingExcludingEvent` preferential pruning in `bookingService.createBooking`
**Suggested Layer**: API

---

### TC-401: Exactly 9 bookings all from same event — 10th triggers same-event fallback and burns seat
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User has 9 bookings all for Event X
**Steps**:
1. Create a new booking for Event X (10th)
2. Re-fetch Event X's available seats
**Expected Results**: Oldest booking removed; new booking created; `availableSeats` is permanently decremented by the new quantity (seat burned via `eventRepository.decrementSeats`)
**Business Rule**: `sameEventFallback = true` → `decrementSeats` called in `bookingService.createBooking`
**Suggested Layer**: API

---

### TC-402: Booking with quantity = 1 (minimum) — full happy path
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User is logged in; event has available seats
**Steps**:
1. Navigate to event detail page
2. Leave quantity at 1 (default minimum)
3. Fill customer form and confirm booking
**Expected Results**: Booking created with `quantity: 1`; `totalPrice = price × 1`; booking ref generated; decrement button disabled at 1
**Business Rule**: quantity boundary: 1 is minimum
**Suggested Layer**: E2E

---

### TC-403: Booking with quantity = 10 (maximum)
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User is logged in; event has >= 10 available seats
**Steps**:
1. Navigate to event detail; click "+" 9 times to reach quantity 10
2. Fill form and confirm booking
**Expected Results**: Booking created with `quantity: 10`; `totalPrice = price × 10`; increment button disabled at 10
**Business Rule**: quantity boundary: 10 is maximum; UI prevents going above `min(10, availableSeats)`
**Suggested Layer**: E2E

---

### TC-404: Refund eligibility boundary — quantity = 2 is NOT eligible (just above threshold)
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User has a booking with quantity = 2
**Steps**:
1. Navigate to booking detail
2. Click "Check eligibility for refund?"
3. Wait 4 seconds
**Expected Results**: Result shows "Not eligible for refund. Group bookings (2 tickets) are non-refundable."
**Business Rule**: Threshold is quantity === 1; quantity = 2 is the first ineligible value
**Suggested Layer**: E2E

---

### TC-405: Booking reference uniqueness — collision retry mechanism
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Many bookings exist with the same event title prefix (stress scenario)
**Steps**:
1. Create many bookings for events starting with the same letter
2. Verify each `bookingRef` is unique in DB
**Expected Results**: All booking references are unique; no duplicates; fallback timestamp-based ref used after 10 failed attempts
**Business Rule**: `generateUniqueRef` — up to 10 retries, then timestamp fallback
**Suggested Layer**: Unit

---

### TC-406: Clear all bookings when only one booking exists
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User has exactly 1 booking
**Steps**:
1. Navigate to `/bookings`
2. Click "Clear all bookings" and confirm
**Expected Results**: Booking is deleted; page shows empty state; `DELETE /api/bookings` returns `{ deleted: 1 }`
**Business Rule**: `clearAllBookings` — `deleteAllForUser` returns count of deleted records
**Suggested Layer**: E2E / API

---

### TC-407: Pagination on bookings list (API) — page 2 with partial results
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User has more bookings than the requested page size
**Steps**:
1. Send `GET /api/bookings?page=2&limit=5`
**Expected Results**: Returns page 2 results; `pagination.page = 2`; `data` array contains at most 5 items
**Business Rule**: Pagination behavior in `bookingService.getBookings`
**Suggested Layer**: API

---

### TC-408: Event title starting with a number — booking ref prefix is uppercase of that character
**Category**: Edge Case
**Priority**: P2
**Preconditions**: An event exists whose title starts with a digit (e.g., "100 Days Festival")
**Steps**:
1. Book the event
2. Check the `bookingRef`
**Expected Results**: `bookingRef` starts with "1-XXXXXX" (digit is used as-is, `toUpperCase()` has no effect on digits)
**Business Rule**: `randomRef` — `prefix = (eventTitle?.[0] ?? 'E').toUpperCase()`
**Suggested Layer**: API / Unit

---

### TC-409: Ticket stepper collapses to a lower max when seats are scarce
**Category**: Edge Case
**Priority**: P2
**Preconditions**: An event has exactly 1 available seat
**Steps**:
1. Navigate to the event detail page
2. Observe the ticket stepper
**Expected Results**: Quantity starts and stays at 1; both "+" (max reached) is disabled; helper text reads "(max 1)"
**Business Rule**: `maxQty = Math.min(10, event.availableSeats)`
**Suggested Layer**: E2E / Component

---

### TC-410: Sold-out event disables booking entirely
**Category**: Edge Case
**Priority**: P1
**Preconditions**: An event has `availableSeats === 0`
**Steps**:
1. Navigate to the event detail page
**Expected Results**: "Available" meta shows "SOLD OUT" in red; submit button reads "Sold Out" and is disabled; form cannot be submitted
**Business Rule**: `soldOut = event.availableSeats === 0`; `maxQty = Math.min(10, 0) = 0`
**Suggested Layer**: E2E / Component

---

### TC-411: Booking exactly the last remaining seat succeeds (boundary, not off-by-one)
**Category**: Edge Case
**Priority**: P1
**Preconditions**: Event has exactly N personal seats available for the current user
**Steps**:
1. Send `POST /api/bookings` with `quantity: N` (exactly equal to remaining seats)
**Expected Results**: HTTP 201; booking succeeds (only `personalAvailable < quantity` fails, so equality is allowed); a subsequent booking of `quantity: 1` for the same event then fails with `InsufficientSeatsError`
**Business Rule**: `personalAvailable < data.quantity` check in `bookingService.createBooking`
**Suggested Layer**: API

---

## UI State

### TC-500: Bookings list shows skeleton loading state while fetching
**Category**: UI State
**Priority**: P1
**Preconditions**: User navigates to `/bookings` (slow network or first load)
**Steps**:
1. Navigate to `/bookings` with throttled network
2. Observe the page before data loads
**Expected Results**: 5 `BookingCardSkeleton` placeholders are shown while `isLoading = true`; no real booking data yet
**Business Rule**: `isLoading` branch in `BookingsContent`
**Suggested Layer**: Component / E2E

---

### TC-501: Bookings list shows empty state when user has no bookings
**Category**: UI State
**Priority**: P1
**Preconditions**: User is logged in with zero bookings
**Steps**:
1. Navigate to `/bookings`
**Expected Results**: Empty state renders with "No bookings yet", "You haven't booked any events yet..." description, and "Browse Events" button linking to `/events`
**Business Rule**: `bookings.length === 0` branch in `BookingsContent`
**Suggested Layer**: E2E / Component

---

### TC-502: Booking detail page shows loading spinner while fetching
**Category**: UI State
**Priority**: P2
**Preconditions**: User navigates to `/bookings/:id` on slow network
**Steps**:
1. Navigate to `/bookings/:id` with throttled network
2. Observe the page before data loads
**Expected Results**: Full-screen spinner (`Spinner size="lg"`) is visible while `isLoading = true`
**Business Rule**: `isLoading` branch in `BookingDetailPage`
**Suggested Layer**: Component

---

### TC-503: Cancel booking confirmation dialog appears before deletion
**Category**: UI State
**Priority**: P0
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "Cancel Booking" button
2. Observe dialog
**Expected Results**: `ConfirmDialog` appears with title "Cancel this booking?", description mentioning the booking ref and seat count, "Yes, cancel it" and close buttons
**Business Rule**: Two-step confirmation prevents accidental cancellations
**Suggested Layer**: E2E / Component

---

### TC-504: Cancel booking dialog close without confirming does NOT cancel
**Category**: UI State
**Priority**: P1
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "Cancel Booking"
2. Click the close/dismiss button on the dialog (not "Yes, cancel it")
3. Observe booking status
**Expected Results**: Dialog closes; booking remains in the list; no API call made
**Business Rule**: `onClose` sets `confirm = false`; `handleCancel` only runs on confirm
**Suggested Layer**: E2E

---

### TC-505: Booking detail breadcrumb displays the booking reference
**Category**: UI State
**Priority**: P2
**Preconditions**: User navigates to a valid booking detail page
**Steps**:
1. Navigate to `/bookings/:id`
2. Observe the breadcrumb nav at the top
**Expected Results**: Breadcrumb shows "My Bookings / {bookingRef}" where bookingRef is in monospace font
**Business Rule**: Breadcrumb uses `booking.bookingRef`
**Suggested Layer**: E2E

---

### TC-506: Cancel booking success — toast and redirect
**Category**: UI State
**Priority**: P0
**Preconditions**: User confirms booking cancellation
**Steps**:
1. Confirm cancellation in the dialog
2. Observe page transition and notifications
**Expected Results**: Success toast "Booking cancelled successfully" appears; user is redirected to `/bookings`
**Business Rule**: `onSuccess` callback in `handleCancel`
**Suggested Layer**: E2E

---

### TC-507: "Clear all bookings" button shows "Clearing…" while in progress
**Category**: UI State
**Priority**: P2
**Preconditions**: User has bookings; network is slow
**Steps**:
1. Click "Clear all bookings" and confirm dialog
2. Observe the button state while request is in flight
**Expected Results**: Button text changes to "Clearing…" and is disabled (`disabled:opacity-50`) during the API call
**Business Rule**: `clearing` state variable in `BookingsContent`
**Suggested Layer**: Component / E2E

---

### TC-508: Refund eligibility — "Check eligibility" button hidden after result shown
**Category**: UI State
**Priority**: P2
**Preconditions**: User is on a booking detail page in idle refund state
**Steps**:
1. Click "Check eligibility for refund?"
2. Wait for result to appear
**Expected Results**: After status transitions from "idle" → "checking" → "eligible/ineligible", the initial button is no longer visible; spinner replaces it during check; result card replaces spinner after 4 seconds
**Business Rule**: `RefundEligibility` component status state machine: idle → checking → eligible/ineligible
**Suggested Layer**: E2E / Component

---

### TC-509: Booking detail shows "Access Denied" state for 403 errors
**Category**: UI State
**Priority**: P0
**Preconditions**: Another user's booking ID is known
**Steps**:
1. Log in as User B
2. Navigate to `/bookings/:userA_booking_id`
3. Observe the rendered state
**Expected Results**: `EmptyState` with title "Access Denied" and description "You are not authorized to view this booking." renders (not "Booking not found")
**Business Rule**: Frontend checks `error.status === 403` to differentiate Access Denied vs Not Found
**Suggested Layer**: E2E

---

### TC-510: Bookings page pagination UI renders when total exceeds page size
**Category**: UI State
**Priority**: P2
**Preconditions**: API returns `pagination.totalPages > 1`
**Steps**:
1. Navigate to `/bookings` with enough bookings to trigger multi-page response
2. Observe pagination controls
**Expected Results**: `Pagination` component renders with correct `currentPage` and `totalPages`; clicking next page updates URL `?page=N` and loads next page of bookings
**Business Rule**: Pagination in `BookingsContent` driven by `pagination` from API response
**Suggested Layer**: E2E / Component

---

### TC-511: Admin bookings table shows loading, error, and empty states
**Category**: UI State
**Priority**: P2
**Preconditions**: `/admin/bookings` under varying data/network conditions
**Steps**:
1. Load the page while fetching (throttled network) — observe spinner
2. Simulate a server error — observe "Couldn't load bookings" + Retry
3. Filter to a status with zero matches (e.g. "Cancelled", see TC-111) — observe "No bookings found"
**Expected Results**: Each of the three states (`isLoading`, `isError`, empty) renders its own dedicated UI in the table container
**Business Rule**: `AdminBookingsPage` conditional rendering branches
**Suggested Layer**: Component / E2E

---

### TC-512: Admin status filter resets pagination to page 1
**Category**: UI State
**Priority**: P2
**Preconditions**: User is on `/admin/bookings` page 2 or later
**Steps**:
1. While on page 2+, change the status filter dropdown
**Expected Results**: Page resets to 1 and the table reloads with the new filter applied
**Business Rule**: `setStatus` handler also calls `setPage(1)` in `AdminBookingsPage`
**Suggested Layer**: Component / E2E

---

### TC-513: Admin cancel confirmation dialog matches list-page wording
**Category**: UI State
**Priority**: P3
**Preconditions**: User is on `/admin/bookings` with a confirmed booking row
**Steps**:
1. Click "Cancel" on a row
2. Observe the confirmation dialog
**Expected Results**: `ConfirmDialog` shows title "Cancel this booking?" and description "This will cancel the booking and restore the seats to the event. This cannot be undone."; confirming cancels the booking and closes the dialog
**Business Rule**: `AdminBookingsPage` `ConfirmDialog` wiring
**Suggested Layer**: E2E / Component
