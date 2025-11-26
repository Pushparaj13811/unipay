import type { PaymentLinks } from 'razorpay/dist/types/paymentLink'

/**
 * Create a mock Razorpay Payment Link
 */
export function createMockPaymentLink(
  overrides: Partial<PaymentLinks.RazorpayPaymentLink> = {}
): PaymentLinks.RazorpayPaymentLink {
  const now = Math.floor(Date.now() / 1000)

  return {
    id: 'plink_' + Math.random().toString(36).substring(7),
    amount: 10000,
    currency: 'INR',
    accept_partial: false,
    first_min_partial_amount: 0,
    description: 'Payment',
    customer: {
      name: 'Test Customer',
      email: 'test@example.com',
      contact: '+919876543210',
    },
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: {},
    callback_url: 'https://example.com/success',
    callback_method: 'get',
    short_url: 'https://rzp.io/i/' + Math.random().toString(36).substring(7),
    status: 'created',
    created_at: now,
    ...overrides,
  } as PaymentLinks.RazorpayPaymentLink
}

/**
 * Create a paid payment link
 */
export function createPaidPaymentLink(
  overrides: Partial<PaymentLinks.RazorpayPaymentLink> = {}
): PaymentLinks.RazorpayPaymentLink {
  return createMockPaymentLink({
    status: 'paid',
    ...overrides,
  })
}

/**
 * Create an expired payment link
 */
export function createExpiredPaymentLink(
  overrides: Partial<PaymentLinks.RazorpayPaymentLink> = {}
): PaymentLinks.RazorpayPaymentLink {
  return createMockPaymentLink({
    status: 'expired',
    ...overrides,
  })
}

/**
 * Create a cancelled payment link
 */
export function createCancelledPaymentLink(
  overrides: Partial<PaymentLinks.RazorpayPaymentLink> = {}
): PaymentLinks.RazorpayPaymentLink {
  return createMockPaymentLink({
    status: 'cancelled',
    ...overrides,
  })
}
