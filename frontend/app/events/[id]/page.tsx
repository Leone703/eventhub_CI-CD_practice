'use client';
import { useParams } from 'next/navigation';
import Link   from 'next/link';
import Image  from 'next/image';
import Badge  from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useEvent } from '@/lib/hooks/useEvents';
import { BookingForm } from './BookingForm';

const CATEGORY_VARIANT: Record<string, string> = {
  Conference: 'indigo', Concert: 'warning', Sports: 'success', Workshop: 'info', Festival: 'danger',
};

const fmt_date  = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
const fmt_time  = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const fmt_price = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EventDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const { data, isLoading, isError } = useEvent(id);
  const event   = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <EmptyState
          title="Event not found"
          description="The event you're looking for doesn't exist or has been removed."
          action={<Link href="/events"><Button>Browse Events</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/events" className="hover:text-indigo-600 transition-colors">Events</Link>
        <span>/</span>
        <span className="text-gray-900 truncate">{event.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: event details ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero image */}
          <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100">
            {event.imageUrl ? (
              <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-indigo-200">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
            )}
          </div>

          {/* Title + badge */}
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant={(CATEGORY_VARIANT[event.category] ?? 'default') as any}>
                {event.category}
              </Badge>
              {event.isStatic && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  Featured
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
            {event.isStatic && (
              <div className="mb-4 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                This is a featured event — always available for practice
              </div>
            )}

            {/* Meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <MetaItem icon="📅" label="Date">{fmt_date(event.eventDate)}</MetaItem>
              <MetaItem icon="🕐" label="Time">{fmt_time(event.eventDate)}</MetaItem>
              <MetaItem icon="📍" label="Venue">{event.venue}</MetaItem>
              <MetaItem icon="🌆" label="City">{event.city}</MetaItem>
              <MetaItem icon="🎫" label="Available">
                <span className={event.availableSeats === 0 ? 'text-red-600 font-bold' : event.availableSeats <= 10 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                  {event.availableSeats === 0 ? 'SOLD OUT' : `${event.availableSeats} / ${event.totalSeats} seats`}
                </span>
              </MetaItem>
              <MetaItem icon="💰" label="Price per ticket">{fmt_price(event.price)}</MetaItem>
            </div>

            {/* Description */}
            {event.description && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">About this event</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: sticky booking panel ─────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Book Tickets</h2>
              <span className="text-2xl font-bold text-indigo-700">{fmt_price(event.price)}</span>
            </div>
            <p className="text-xs text-gray-400 mb-5">per ticket</p>
            <BookingForm event={event} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3.5">
      <span className="text-lg shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-800 font-medium mt-0.5">{children}</p>
      </div>
    </div>
  );
}
