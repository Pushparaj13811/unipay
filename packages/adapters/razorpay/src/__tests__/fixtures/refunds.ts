import type { Refunds } from 'razorpay/dist/types/refunds'

/**
 * Create a mock Razorpay Refund
 */
export function createMockRefund(
  overrides: Partial<Refunds.RazorpayRefund> = {}
): Refunds.RazorpayRefund {
  const now = Math.floor(Date.now() / 1000)

  return {
    id: 'rfnd_' + Math.random().toString(36).substring(7),
    entity: 'refund',
    amount: 10000,
    currency: 'INR',
    payment_id: 'pay_' + Math.random().toString(36).substring(7),
    notes: {},
    receipt: null,
    acquirer_data: {
      rrn: 'rrn_' + Math.random().toString(36).substring(7),
    },
    created_at: now,
    batch_id: null,
    status: 'processed',
    speed_processed: 'normal',
    speed_requested: 'normal',
    ...overrides,
  } as Refunds.RazorpayRefund
}

/**
 * Create a pending refund
 */
export function createPendingRefund(
  overrides: Partial<Refunds.RazorpayRefund> = {}
): Refunds.RazorpayRefund {
  return createMockRefund({
    status: 'pending',
    ...overrides,
  })
}

/**
 * Create a processed (successful) refund
 */
export function createProcessedRefund(
  overrides: Partial<Refunds.RazorpayRefund> = {}
): Refunds.RazorpayRefund {
  return createMockRefund({
    status: 'processed',
    ...overrides,
  })
}

/**
 * Create a failed refund
 */
export function createFailedRefund(
  overrides: Partial<Refunds.RazorpayRefund> = {}
): Refunds.RazorpayRefund {
  return createMockRefund({
    status: 'failed',
    ...overrides,
  })
}

/**
 * Create a list of refunds response
 */
export function createRefundList(
  refunds: Refunds.RazorpayRefund[] = [],
  count?: number
): { entity: 'collection'; count: number; items: Refunds.RazorpayRefund[] } {
  return {
    entity: 'collection',
    count: count ?? refunds.length,
    items: refunds,
  }
}
