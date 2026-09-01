'use client';
import { useState } from 'react';
import Link   from 'next/link';
import Button from '@/components/ui/Button';
import Input  from '@/components/ui/Input';
import { useCreateBooking } from '@/lib/hooks/useBookings';
import { useToast }         from '@/components/ui/Toast';

const fmt_price = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// ── Booking confirmation card ─────────────────────────────────────────────────
function BookingConfirmation({ booking }: { booking: any }) {
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">Booking Confirmed! 🎉</h3>
      <p className="text-gray-500 text-sm mb-5">Your tickets are reserved.</p>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5 text-left space-y-2">
        <Row label="Booking Ref">
          <span className="booking-ref font-mono font-bold text-indigo-600">{booking.data?.bookingRef}</span>
        </Row>
        <Row label="Customer">{booking.data?.customerName}</Row>
        <Row label="Tickets">{booking.data?.quantity}</Row>
        <Row label="Total">{fmt_price(booking.data?.totalPrice)}</Row>
      </div>

      <div className="flex flex-col gap-2">
        <Link href="/bookings">
          <Button className="w-full">View My Bookings</Button>
        </Link>
        <Link href="/events">
          <Button variant="ghost" className="w-full">Browse More Events</Button>
        </Link>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{children}</span>
    </div>
  );
}

// ── Booking form ──────────────────────────────────────────────────────────────
export function BookingForm({ event }: { event: any }) {
  const toast = useToast();
  const { mutate: createBooking, isPending } = useCreateBooking();

  const [form, setForm] = useState({
    customerName: '', customerEmail: '', customerPhone: '', quantity: 1,
  });
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<any>(null);

  if (confirmed) return <BookingConfirmation booking={confirmed} />;

  const maxQty   = Math.min(10, event.availableSeats);
  const total    = parseFloat(event.price) * form.quantity;
  const soldOut  = event.availableSeats === 0;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerName.trim() || form.customerName.length < 2) e.customerName = 'Name must be at least 2 chars';
    if (!form.customerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.customerEmail = 'Enter a valid email';
    if (!form.customerPhone.trim() || form.customerPhone.replace(/\D/g, '').length < 10) e.customerPhone = 'Enter a valid 10-digit phone';
    if (form.quantity < 1 || form.quantity > maxQty) e.quantity = `Quantity must be 1–${maxQty}`;
    return e;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    createBooking(
      { ...form, eventId: event.id, quantity: Number(form.quantity) },
      {
        onSuccess: (res) => setConfirmed(res),
        onError:   (err: any) => toast(err.message, 'error'),
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {/* Quantity */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Tickets</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
            className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-100 transition-colors disabled:opacity-40"
            disabled={form.quantity <= 1}
          >−</button>
          <span id="ticket-count" className="ticket-count w-8 text-center font-semibold text-lg">{form.quantity}</span>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, quantity: Math.min(maxQty, f.quantity + 1) }))}
            className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-100 transition-colors disabled:opacity-40"
            disabled={form.quantity >= maxQty}
          >+</button>
          <span className="text-sm text-gray-400">(max {maxQty})</span>
        </div>
        {errors.quantity && <p className="text-xs text-red-600">{errors.quantity}</p>}
      </div>

      <Input id="customerName"  name="customerName"  label="Full Name"    required value={form.customerName}  onChange={set('customerName')}  error={errors.customerName}  placeholder="Your full name" />
      <Input data-testid="customer-email" id="customer-email" name="customerEmail" label="Email"        required type="email" value={form.customerEmail} onChange={set('customerEmail')} error={errors.customerEmail} placeholder="you@email.com" />
      <Input id="phone"         name="phone"         label="Phone Number" required type="tel"   value={form.customerPhone} onChange={set('customerPhone')} error={errors.customerPhone} placeholder="+91 98765 43210" />

      {/* Price summary */}
      <div className="bg-indigo-50 rounded-xl p-4 space-y-1.5 text-sm border border-indigo-100">
        <div className="flex justify-between text-gray-600">
          <span>{fmt_price(event.price)} × {form.quantity} ticket{form.quantity > 1 ? 's' : ''}</span>
          <span>{fmt_price(total)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-indigo-200">
          <span>Total</span>
          <span className="text-indigo-700">{fmt_price(total)}</span>
        </div>
      </div>

      <Button id="confirm-booking" type="submit" loading={isPending} className="confirm-booking-btn w-full" size="lg" disabled={soldOut}>
        {soldOut ? 'Sold Out' : 'Confirm Booking'}
      </Button>
    </form>
  );
}
