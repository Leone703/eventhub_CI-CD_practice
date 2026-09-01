import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RefundEligibility } from '../RefundEligibility';

describe('RefundEligibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // TC-508: idle state shows the "Check eligibility" button
  test('idle state shows the check-eligibility button and no result', () => {
    render(<RefundEligibility quantity={1} />);
    expect(screen.getByTestId('check-refund-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('refund-result')).not.toBeInTheDocument();
    expect(screen.queryByTestId('refund-spinner')).not.toBeInTheDocument();
  });

  // TC-105 + TC-508: clicking shows spinner immediately, button disappears
  test('clicking check-eligibility swaps the button for a spinner immediately', () => {
    render(<RefundEligibility quantity={1} />);
    act(() => {
      screen.getByTestId('check-refund-btn').click();
    });

    expect(screen.queryByTestId('check-refund-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('refund-spinner')).toBeInTheDocument();
    expect(screen.queryByTestId('refund-result')).not.toBeInTheDocument();
  });

  // TC-103: quantity = 1 is eligible after ~4s, spinner is replaced by the result
  test('quantity = 1 becomes eligible after 4 seconds', () => {
    render(<RefundEligibility quantity={1} />);
    act(() => {
      screen.getByTestId('check-refund-btn').click();
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByTestId('refund-spinner')).not.toBeInTheDocument();
    const result = screen.getByTestId('refund-result');
    expect(result).toHaveTextContent('Eligible for refund');
    expect(result).toHaveTextContent('Single-ticket bookings qualify for a full refund');
  });

  // TC-104: quantity > 1 is not eligible, and shows the exact ticket count
  test('quantity = 3 is not eligible after 4 seconds and shows the ticket count', () => {
    render(<RefundEligibility quantity={3} />);
    act(() => {
      screen.getByTestId('check-refund-btn').click();
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    const result = screen.getByTestId('refund-result');
    expect(result).toHaveTextContent('Not eligible for refund');
    expect(result).toHaveTextContent('Group bookings (3 tickets) are non-refundable');
  });

  // TC-404 boundary: quantity = 2 is the first ineligible value
  test('quantity = 2 (boundary) is not eligible', () => {
    render(<RefundEligibility quantity={2} />);
    act(() => {
      screen.getByTestId('check-refund-btn').click();
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId('refund-result')).toHaveTextContent('Group bookings (2 tickets) are non-refundable');
  });

  // Spinner is still visible just before the 4s mark, confirming the timing isn't instant
  test('spinner is still visible just before the 4-second mark', () => {
    render(<RefundEligibility quantity={1} />);
    act(() => {
      screen.getByTestId('check-refund-btn').click();
    });
    act(() => {
      vi.advanceTimersByTime(3900);
    });

    expect(screen.getByTestId('refund-spinner')).toBeInTheDocument();
    expect(screen.queryByTestId('refund-result')).not.toBeInTheDocument();
  });
});
