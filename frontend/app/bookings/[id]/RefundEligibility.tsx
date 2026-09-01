'use client';
import { useState } from 'react';
import Spinner from '@/components/ui/Spinner';

// ── Refund Eligibility ────────────────────────────────────────────────────────
export function RefundEligibility({ quantity }: { quantity: number }) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'eligible' | 'ineligible'>('idle');

  const check = () => {
    setStatus('checking');
    setTimeout(() => {
      setStatus(quantity === 1 ? 'eligible' : 'ineligible');
    }, 4000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Refund</h2>

      {status === 'idle' && (
        <button
          data-testid="check-refund-btn" id="check-refund-btn"
          onClick={check}
          className="text-sm text-indigo-600 hover:underline"
        >
          Check eligibility for refund?
        </button>
      )}

      {status === 'checking' && (
        <div data-testid="refund-spinner" id="refund-spinner" className="flex items-center gap-3 text-sm text-gray-500">
          <Spinner size="sm" />
          <span>Checking your refund eligibility…</span>
        </div>
      )}

      {status === 'eligible' && (
        <div data-testid="refund-result" id="refund-result" className="flex items-start gap-2.5 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span><strong>Eligible for refund.</strong> Single-ticket bookings qualify for a full refund.</span>
        </div>
      )}

      {status === 'ineligible' && (
        <div data-testid="refund-result" id="refund-result" className="flex items-start gap-2.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span><strong>Not eligible for refund.</strong> Group bookings ({quantity} tickets) are non-refundable.</span>
        </div>
      )}
    </div>
  );
}
