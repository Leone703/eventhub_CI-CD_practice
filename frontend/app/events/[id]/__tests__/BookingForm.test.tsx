import { describe, test, expect } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test-utils/render';
import { BookingForm } from '../BookingForm';

function stepperButtons(container: HTMLElement) {
  const buttons = container.querySelectorAll('button[type="button"]');
  return { decrementBtn: buttons[0] as HTMLButtonElement, incrementBtn: buttons[1] as HTMLButtonElement };
}

function ticketCount(container: HTMLElement) {
  return container.querySelector('#ticket-count')?.textContent;
}

const baseEvent = {
  id: 1,
  title: 'Tech Conference Bangalore',
  price: 1499,
  availableSeats: 10,
  totalSeats: 500,
};

describe('BookingForm — ticket stepper (TC-110, TC-402, TC-403, TC-409, TC-410)', () => {
  // TC-402: decrement disabled at the minimum (quantity = 1)
  test('decrement button is disabled at quantity = 1', () => {
    const { container } = renderWithProviders(<BookingForm event={baseEvent} />);
    const { decrementBtn } = stepperButtons(container);
    expect(ticketCount(container)).toBe('1');
    expect(decrementBtn).toBeDisabled();
  });

  // TC-403: increment caps at 10 when the event has plenty of seats
  test('increment stops at 10 when availableSeats >= 10', () => {
    const { container } = renderWithProviders(<BookingForm event={{ ...baseEvent, availableSeats: 15 }} />);
    const { incrementBtn } = stepperButtons(container);

    for (let i = 0; i < 12; i++) fireEvent.click(incrementBtn);

    expect(ticketCount(container)).toBe('10');
    expect(incrementBtn).toBeDisabled();
    expect(screen.getByText('(max 10)')).toBeInTheDocument();
  });

  // TC-110 / TC-409: increment caps below 10 when seats are scarce
  test('increment stops at availableSeats when fewer than 10 seats remain', () => {
    const { container } = renderWithProviders(<BookingForm event={{ ...baseEvent, availableSeats: 3 }} />);
    const { incrementBtn } = stepperButtons(container);

    for (let i = 0; i < 12; i++) fireEvent.click(incrementBtn);

    expect(ticketCount(container)).toBe('3');
    expect(incrementBtn).toBeDisabled();
    expect(screen.getByText('(max 3)')).toBeInTheDocument();
  });

  // TC-409 boundary: exactly 1 seat left — stepper never leaves quantity = 1
  test('with exactly 1 seat left, quantity stays at 1 and both directions are capped', () => {
    const { container } = renderWithProviders(<BookingForm event={{ ...baseEvent, availableSeats: 1 }} />);
    const { decrementBtn, incrementBtn } = stepperButtons(container);

    fireEvent.click(incrementBtn);

    expect(ticketCount(container)).toBe('1');
    expect(decrementBtn).toBeDisabled();
    expect(incrementBtn).toBeDisabled();
    expect(screen.getByText('(max 1)')).toBeInTheDocument();
  });

  // TC-410: sold-out event disables the whole form
  test('sold-out event (availableSeats = 0) shows "Sold Out" and disables submit', () => {
    renderWithProviders(<BookingForm event={{ ...baseEvent, availableSeats: 0 }} />);

    const submitBtn = screen.getByRole('button', { name: /sold out/i });
    expect(submitBtn).toBeDisabled();
  });
});
