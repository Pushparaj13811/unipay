import type { Payments } from 'razorpay/dist/types/payments'

/**
 * Create a mock Razorpay Payment
 */
export function createMockPayment(
  overrides: Partial<Payments.RazorpayPayment> = {}
): Payments.RazorpayPayment {
  const now = Math.floor(Date.now() / 1000)

  return {
    id: 'pay_' + Math.random().toString(36).substring(7),
    entity: 'payment',
    amount: 10000,
    currency: 'INR',
    status: 'captured',
    order_id: 'order_' + Math.random().toString(36).substring(7),
    invoice_id: null,
    international: false,
    method: 'card',
    amount_refunded: 0,
    refund_status: null,
    captured: true,
    description: 'Test payment',
    card_id: 'card_' + Math.random().toString(36).substring(7),
    bank: null,
    wallet: null,
    vpa: null,
    email: 'test@example.com',
    contact: '+919876543210',
    fee: 200,
    tax: 36,
    error_code: null,
    error_description: null,
    error_source: null,
    error_step: null,
    error_reason: null,
    acquirer_data: {
      bank_transaction_id: 'txn_' + Math.random().toString(36).substring(7),
    },
    notes: {},
    created_at: now,
    ...overrides,
  } as Payments.RazorpayPayment
}

/**
 * Create a captured payment
 */
export function createCapturedPayment(
  overrides: Partial<Payments.RazorpayPayment> = {}
): Payments.RazorpayPayment {
  return createMockPayment({
    status: 'captured',
    captured: true,
    ...overrides,
  })
}

/**
 * Create an authorized (not captured) payment
 */
export function createAuthorizedPayment(
  overrides: Partial<Payments.RazorpayPayment> = {}
): Payments.RazorpayPayment {
  return createMockPayment({
    status: 'authorized',
    captured: false,
    ...overrides,
  })
}

/**
 * Create a failed payment
 */
export function createFailedPayment(
  overrides: Partial<Payments.RazorpayPayment> = {}
): Payments.RazorpayPayment {
  return createMockPayment({
    status: 'failed',
    captured: false,
    error_code: 'BAD_REQUEST_ERROR',
    error_description: 'Payment failed due to insufficient funds',
    ...overrides,
  })
}

/**
 * Create a refunded payment
 */
export function createRefundedPayment(
  overrides: Partial<Payments.RazorpayPayment> = {}
): Payments.RazorpayPayment {
  return createMockPayment({
    status: 'refunded',
    captured: true,
    amount_refunded: 10000,
    refund_status: 'full',
    ...overrides,
  })
}

/**
 * Create a partial refund payment
 */
export function createPartiallyRefundedPayment(
  overrides: Partial<Payments.RazorpayPayment> = {}
): Payments.RazorpayPayment {
  return createMockPayment({
    status: 'captured',
    captured: true,
    amount_refunded: 5000,
    refund_status: 'partial',
    ...overrides,
  })
}
