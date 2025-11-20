import type Stripe from 'stripe'

/**
 * Create a mock Stripe Refund
 */
export function createMockRefund(
  overrides: Partial<Stripe.Refund> = {}
): Stripe.Refund {
  const now = Math.floor(Date.now() / 1000)

  return {
    id: 're_' + Math.random().toString(36).substring(7),
    object: 'refund',
    amount: 10000,
    balance_transaction: 'txn_' + Math.random().toString(36).substring(7),
    charge: 'ch_' + Math.random().toString(36).substring(7),
    created: now,
    currency: 'usd',
    destination_details: null,
    metadata: {},
    payment_intent: 'pi_test_' + Math.random().toString(36).substring(7),
    reason: null,
    receipt_number: null,
    source_transfer_reversal: null,
    status: 'succeeded',
    transfer_reversal: null,
    ...overrides,
  } as Stripe.Refund
}

/**
 * Create a pending refund
 */
export function createPendingRefund(
  overrides: Partial<Stripe.Refund> = {}
): Stripe.Refund {
  return createMockRefund({
    status: 'pending',
    ...overrides,
  })
}

/**
 * Create a failed refund
 */
export function createFailedRefund(
  overrides: Partial<Stripe.Refund> = {}
): Stripe.Refund {
  return createMockRefund({
    status: 'failed',
    ...overrides,
  })
}

/**
 * Create a list of refunds response
 */
export function createRefundList(
  refunds: Stripe.Refund[] = [],
  hasMore: boolean = false
): Stripe.ApiList<Stripe.Refund> {
  return {
    object: 'list',
    data: refunds,
    has_more: hasMore,
    url: '/v1/refunds',
  }
}
