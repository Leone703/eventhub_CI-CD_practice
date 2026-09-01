import { test, expect } from '@playwright/test';

const BASE_URL      = 'https://eventhub.rahulshettyacademy.com';
const USER_EMAIL    = 'rahulshetty1@gmail.com';
const USER_PASSWORD = 'Magiclife1!';

// Customer details reused for every booking created in this suite
const CUSTOMER = {
  name:  'Test User',
  email: 'testuser@example.com',
  phone: '9876543210',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('you@email.com').fill(USER_EMAIL);
  await page.getByLabel('Password').fill(USER_PASSWORD);
  await page.locator('#login-btn').click();
  // Successful login redirects away from /login to the home page
  await expect(page).toHaveURL(/rahulshettyacademy\.com\/?$/);
  await expect(page.getByRole('link', { name: /Browse Events/i }).first()).toBeVisible();
}

/**
 * Books the first available (non-sold-out) event on the events page.
 * Returns { bookingRef, eventTitle } from the confirmation card.
 * Precondition: user must be logged in before calling.
 */
async function bookEvent(page) {
  await page.goto(`${BASE_URL}/events`);

  // Pick the first card whose CTA is an active "Book Now" — sold-out cards
  // render the same data-testid but with the label "Sold Out".
  const firstCard = page.getByTestId('event-card').filter({
    has: page.getByTestId('book-now-btn').filter({ hasText: 'Book Now' }),
  }).first();
  await expect(firstCard).toBeVisible();

  // Capture title before navigating away
  const eventTitle = (await firstCard.locator('h3').textContent())?.trim() ?? '';
  console.log(`Booking event: "${eventTitle}"`);

  await firstCard.getByTestId('book-now-btn').click();
  await expect(page).toHaveURL(/\/events\/\d+/);

  // Fill booking form (quantity defaults to 1)
  await page.getByLabel('Full Name').fill(CUSTOMER.name);
  await page.getByTestId('customer-email').fill(CUSTOMER.email);
  await page.getByPlaceholder('+91 98765 43210').fill(CUSTOMER.phone);
  await page.getByRole('button', { name: 'Confirm Booking' }).click();

  // Wait for confirmation card
  const refEl = page.locator('.booking-ref').first();
  await expect(refEl).toBeVisible();
  const bookingRef = (await refEl.textContent())?.trim() ?? '';
  console.log(`Booking confirmed. Ref: ${bookingRef}`);
  return { bookingRef, eventTitle };
}

/**
 * Clears all bookings. Safe to call when already empty.
 */
async function clearBookings(page) {
  await page.goto(`${BASE_URL}/bookings`);

  const clearBtn = page.getByRole('button', { name: /clear all bookings/i });
  await expect(clearBtn).toBeVisible();

  // Wait for the list to settle into one of its two terminal states
  await expect(
    page.getByText('No bookings yet').or(page.getByTestId('booking-card').first()),
  ).toBeVisible();
  if (await page.getByText('No bookings yet').isVisible()) return;

  page.once('dialog', (dialog) => dialog.accept());
  await clearBtn.click();
  await expect(page.getByText('No bookings yet')).toBeVisible();
}

// ── Test Suite ─────────────────────────────────────────────────────────────────

test.describe('Booking Management — Critical Happy Paths', () => {

  // Every test starts logged in with a clean bookings list
  test.beforeEach(async ({ page }) => {
    await login(page);
    await clearBookings(page);
  });

  // TC-001 ───────────────────────────────────────────────────────────────────
  test('TC-001: displays booking card on bookings list page', async ({ page }) => {
    // -- Step 1: Create one booking --
    const { bookingRef, eventTitle } = await bookEvent(page);

    // -- Step 2: Navigate to /bookings --
    await page.goto(`${BASE_URL}/bookings`);

    // -- Step 3: Assert booking card appears with correct data --
    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await expect(card).toBeVisible();
    await expect(card).toContainText(eventTitle);
    await expect(card).toContainText('confirmed');
    await expect(card).toContainText(bookingRef);
  });

  // TC-002 ───────────────────────────────────────────────────────────────────
  test('TC-002: shows all sections on booking detail page', async ({ page }) => {
    // -- Step 1: Create one booking --
    const { bookingRef, eventTitle } = await bookEvent(page);

    // -- Step 2: Navigate to /bookings and click View Details --
    await page.goto(`${BASE_URL}/bookings`);
    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await card.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Step 3: Verify the booking ref chip in the page header --
    await expect(
      page.locator('span.font-mono.font-bold').filter({ hasText: bookingRef }),
    ).toBeVisible();

    // -- Step 4: Verify event details section --
    await expect(page.getByText('Event Details')).toBeVisible();
    await expect(page.getByText(eventTitle).first()).toBeVisible();

    // -- Step 5: Verify customer details section --
    await expect(page.getByText('Customer Details')).toBeVisible();
    await expect(page.getByText(CUSTOMER.name)).toBeVisible();

    // -- Step 6: Verify payment summary section --
    await expect(page.getByText('Payment Summary')).toBeVisible();
    await expect(page.getByText('Total Paid')).toBeVisible();

    // -- Step 7: Verify refund eligibility check button is present --
    await expect(page.locator('#check-refund-btn')).toBeVisible();
  });

  // TC-006 ───────────────────────────────────────────────────────────────────
  test('TC-006: navigates to bookings list after booking via View My Bookings link', async ({ page }) => {
    // -- Step 1: Book the first available event --
    const { bookingRef } = await bookEvent(page);

    // -- Step 2: Click "View My Bookings" link on the confirmation card --
    await page.getByRole('link', { name: 'View My Bookings' }).click();
    await expect(page).toHaveURL(`${BASE_URL}/bookings`);

    // -- Step 3: Assert the new booking appears in the list --
    const bookingCard = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await expect(bookingCard).toBeVisible();
  });

  // TC-102 ───────────────────────────────────────────────────────────────────
  test('TC-102: booking reference starts with first letter of event title (uppercase)', async ({ page }) => {
    // -- Step 1: Book first available event and capture title --
    const { bookingRef, eventTitle } = await bookEvent(page);

    // -- Step 2: Assert ref starts with the event title's first char --
    const expectedPrefix = eventTitle[0].toUpperCase();
    expect(bookingRef.startsWith(`${expectedPrefix}-`)).toBe(true);
    expect(bookingRef).toMatch(/^.-[A-Z0-9]{6}$/);
    console.log(`Ref "${bookingRef}" correctly starts with "${expectedPrefix}-" (event: "${eventTitle}")`);
  });

  // TC-003 + TC-506 ──────────────────────────────────────────────────────────
  test('TC-003: cancels booking from detail page — shows toast and redirects', async ({ page }) => {
    // -- Step 1: Create one booking --
    const { bookingRef } = await bookEvent(page);

    // -- Step 2: Navigate to booking detail via View Details --
    await page.goto(`${BASE_URL}/bookings`);
    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await card.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Step 3: Click Cancel Booking button on detail page --
    await page.getByRole('button', { name: 'Cancel Booking' }).click();

    // -- Step 4: Assert React confirmation dialog appears --
    await expect(page.getByText('Cancel this booking?')).toBeVisible();
    await expect(page.locator('#confirm-dialog-yes')).toBeVisible();

    // -- Step 5: Confirm cancellation --
    await page.locator('#confirm-dialog-yes').click();

    // -- Step 6: Assert redirect to /bookings and success toast --
    await expect(page).toHaveURL(`${BASE_URL}/bookings`);
    await expect(page.getByText('Booking cancelled successfully')).toBeVisible();

    // -- Step 7: Assert booking is no longer in the list --
    await expect(page.getByText('No bookings yet')).toBeVisible();
  });

  // TC-004 ───────────────────────────────────────────────────────────────────
  test('TC-004: clears all bookings and shows empty state', async ({ page }) => {
    // -- Step 1: Create one booking --
    await bookEvent(page);

    // -- Step 2: Navigate to /bookings and verify booking exists --
    await page.goto(`${BASE_URL}/bookings`);
    await expect(page.getByTestId('booking-card').first()).toBeVisible();

    // -- Step 3: Click "Clear all bookings" and accept browser confirm dialog --
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /clear all bookings/i }).click();

    // -- Step 4: Assert empty state --
    await expect(page.getByText('No bookings yet')).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Browse Events' })).toBeVisible();
  });

  // TC-005 ───────────────────────────────────────────────────────────────────
  test('TC-005: navigates back to bookings list from detail page', async ({ page }) => {
    // -- Step 1: Create one booking --
    const { bookingRef } = await bookEvent(page);

    // -- Step 2: Navigate to booking detail via View Details --
    await page.goto(`${BASE_URL}/bookings`);
    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await card.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Step 3: Click "← Back to My Bookings" --
    await page.getByRole('link', { name: /Back to My Bookings/i }).click();

    // -- Step 4: Assert we're back on the bookings list --
    await expect(page).toHaveURL(`${BASE_URL}/bookings`);
    await expect(page.getByTestId('booking-card').filter({ hasText: bookingRef })).toBeVisible();
  });

  // TC-008 ───────────────────────────────────────────────────────────────────
  test('TC-008: admin bookings table shows own bookings with all columns', async ({ page }) => {
    // -- Step 1: Create one booking --
    const { bookingRef, eventTitle } = await bookEvent(page);

    // -- Step 2: Navigate to /admin/bookings --
    await page.goto(`${BASE_URL}/admin/bookings`);

    // -- Step 3: Assert header shows the running total --
    await expect(page.getByText('1 total bookings', { exact: true })).toBeVisible();

    // -- Step 4: Assert all table columns are present --
    const headerRow = page.locator('table thead tr');
    for (const column of ['Ref', 'Customer', 'Event', 'Qty', 'Total', 'Status', 'Date', 'Actions']) {
      await expect(headerRow).toContainText(column);
    }

    // -- Step 5: Assert our booking's row renders with correct data --
    const row = page.locator('table tbody tr').filter({ hasText: bookingRef });
    await expect(row).toBeVisible();
    await expect(row).toContainText(eventTitle);
    await expect(row).toContainText('confirmed');
    await expect(row.getByRole('button', { name: 'View' })).toBeVisible();
  });

  // TC-009 ───────────────────────────────────────────────────────────────────
  test('TC-009: admin "View" modal shows full booking details and closes', async ({ page }) => {
    // -- Step 1: Create one booking --
    const { bookingRef, eventTitle } = await bookEvent(page);

    // -- Step 2: Navigate to /admin/bookings and open the View modal --
    await page.goto(`${BASE_URL}/admin/bookings`);
    const row = page.locator('table tbody tr').filter({ hasText: bookingRef });
    await row.getByRole('button', { name: 'View' }).click();

    // -- Step 3: Assert modal shows reference, event, and customer details --
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: `Booking — ${bookingRef}` })).toBeVisible();
    await expect(dialog).toContainText(eventTitle);
    await expect(dialog).toContainText(CUSTOMER.name);
    await expect(dialog).toContainText(CUSTOMER.email);

    // -- Step 4: Close the modal and assert the table is visible again --
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(row).toBeVisible();
  });

});
