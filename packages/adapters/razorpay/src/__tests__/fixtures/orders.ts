import type { Orders } from 'razorpay/dist/types/orders'

/**
 * Create a mock Razorpay Order
 */
export function createMockOrder(
  overrides: Partial<Orders.RazorpayOrder> = {}
): Orders.RazorpayOrder {
  const now = Math.floor(Date.now() / 1000)

  return {
    id: 'order_' + Math.random().toString(36).substring(7),
    entity: 'order',
    amount: 10000,
    amount_paid: 0,
    amount_due: 10000,
    currency: 'INR',
    receipt: 'rcpt_' + Math.random().toString(36).substring(7),
    offer_id: null,
    status: 'created',
    attempts: 0,
    notes: {},
    created_at: now,
    ...overrides,
  } as Orders.RazorpayOrder
}

/**
 * Create a paid order
 */
export function createPaidOrder(
  overrides: Partial<Orders.RazorpayOrder> = {}
): Orders.RazorpayOrder {
  return createMockOrder({
    status: 'paid',
    amount_paid: 10000,
    amount_due: 0,
    attempts: 1,
    ...overrides,
  })
}

/**
 * Create an attempted (but not paid) order
 */
export function createAttemptedOrder(
  overrides: Partial<Orders.RazorpayOrder> = {}
): Orders.RazorpayOrder {
  return createMockOrder({
    status: 'attempted',
    attempts: 1,
    ...overrides,
  })
}
