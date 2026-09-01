jest.mock('../../repositories/bookingRepository');
jest.mock('../../repositories/eventRepository');
jest.mock('../../config/database', () => ({
  booking: { create: jest.fn() },
}));

const bookingRepository = require('../../repositories/bookingRepository');
const eventRepository = require('../../repositories/eventRepository');
const prisma = require('../../config/database');
const bookingService = require('../bookingService');

// Baseline mocks shared by every test: no FIFO pruning, one seat-rich event,
// no ref collisions, prisma.booking.create echoes back whatever it was called with.
function setUpHappyPath({ event, existingRefs = [] } = {}) {
  bookingRepository.countUserBookings.mockResolvedValue(0);
  bookingRepository.getBookedQuantitiesForEvents.mockResolvedValue({});
  eventRepository.findById.mockResolvedValue(event);
  bookingRepository.findByRef.mockImplementation((ref) =>
    Promise.resolve(existingRefs.includes(ref) ? { id: 999, bookingRef: ref } : null),
  );
  prisma.booking.create.mockImplementation(({ data }) =>
    Promise.resolve({ id: 1, ...data, event }),
  );
}

const BASE_PAYLOAD = {
  eventId:       1,
  customerName:  'Jane Doe',
  customerEmail: 'jane@example.com',
  customerPhone: '9876543210',
  quantity:      2,
};

describe('bookingService.createBooking — pure business logic (TC-102, TC-106, TC-405)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TC-102 ─────────────────────────────────────────────────────────────────────
  describe('TC-102: booking reference prefix matches the event title\'s first character', () => {
    test.each([
      ['Tech Summit', 'T'],
      ['100 Days Festival', '1'], // TC-408 boundary: digit titles use the digit as-is
      ['ipl cricket finals', 'I'], // lowercase title is still uppercased
    ])('title "%s" → ref prefix "%s-"', async (title, expectedPrefix) => {
      const event = { id: 1, title, price: 100, availableSeats: 10 };
      setUpHappyPath({ event });

      await bookingService.createBooking(BASE_PAYLOAD, 42);

      const createdData = prisma.booking.create.mock.calls[0][0].data;
      expect(createdData.bookingRef).toMatch(new RegExp(`^${expectedPrefix}-[A-Z0-9]{6}$`));
    });
  });

  // TC-106 ─────────────────────────────────────────────────────────────────────
  describe('TC-106: totalPrice = event.price × quantity', () => {
    test.each([
      [1499, 3, 4497],
      [49.5, 4, 198],
      [0, 5, 0],
    ])('price %p × quantity %p = totalPrice %p', async (price, quantity, expectedTotal) => {
      const event = { id: 1, title: 'Marathon Chennai', price, availableSeats: 10 };
      setUpHappyPath({ event });

      await bookingService.createBooking({ ...BASE_PAYLOAD, quantity }, 42);

      const createdData = prisma.booking.create.mock.calls[0][0].data;
      expect(createdData.totalPrice).toBe(expectedTotal);
    });
  });

  // TC-405 ─────────────────────────────────────────────────────────────────────
  describe('TC-405: booking reference uniqueness — collision retry mechanism', () => {
    test('retries on collision and succeeds once a unique ref is generated', async () => {
      const event = { id: 1, title: 'Food Festival Bangalore', price: 149, availableSeats: 10 };
      // First two generated refs "collide" with existing bookings; the third succeeds.
      let attempts = 0;
      bookingRepository.countUserBookings.mockResolvedValue(0);
      bookingRepository.getBookedQuantitiesForEvents.mockResolvedValue({});
      eventRepository.findById.mockResolvedValue(event);
      bookingRepository.findByRef.mockImplementation(() => {
        attempts += 1;
        return Promise.resolve(attempts <= 2 ? { id: 999 } : null);
      });
      prisma.booking.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data, event }));

      await bookingService.createBooking(BASE_PAYLOAD, 42);

      expect(bookingRepository.findByRef).toHaveBeenCalledTimes(3);
      const createdData = prisma.booking.create.mock.calls[0][0].data;
      expect(createdData.bookingRef).toMatch(/^F-[A-Z0-9]{6}$/);
    });

    test('falls back to a timestamp-based ref after 10 failed collision attempts', async () => {
      const event = { id: 1, title: 'Food Festival Bangalore', price: 149, availableSeats: 10 };
      bookingRepository.countUserBookings.mockResolvedValue(0);
      bookingRepository.getBookedQuantitiesForEvents.mockResolvedValue({});
      eventRepository.findById.mockResolvedValue(event);
      // Every generated ref "collides" — forces the 10-attempt retry loop to exhaust.
      bookingRepository.findByRef.mockResolvedValue({ id: 999 });
      prisma.booking.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data, event }));

      await bookingService.createBooking(BASE_PAYLOAD, 42);

      // 10 retries, then the fallback path stops checking and just uses a timestamp suffix
      expect(bookingRepository.findByRef).toHaveBeenCalledTimes(10);
      const createdData = prisma.booking.create.mock.calls[0][0].data;
      expect(createdData.bookingRef).toMatch(/^F-[0-9A-Z]{1,8}$/);
    });
  });
});
