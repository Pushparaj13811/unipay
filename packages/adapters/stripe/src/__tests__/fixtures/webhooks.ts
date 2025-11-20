import type Stripe from 'stripe'

/**
 * Create a mock webhook event
 */
export function createMockWebhookEvent(
  type: string,
  data: Record<string, unknown>,
  overrides: Partial<Stripe.Event> = {}
): Stripe.Event {
  const now = Math.floor(Date.now() / 1000)

  return {
    id: 'evt_' + Math.random().toString(36).substring(7),
    object: 'event',
    api_version: '2023-10-16',
    created: now,
    data: {
      object: data as Stripe.Event.Data.Object,
      previous_attributes: undefined,
    },
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: 'req_' + Math.random().toString(36).substring(7),
      idempotency_key: null,
    },
    type: type as Stripe.Event.Type,
    ...overrides,
  } as Stripe.Event
}

/**
 * Create a checkout.session.completed webhook event
 */
export function createCheckoutSessionCompletedEvent(
  sessionData: Partial<Stripe.Checkout.Session> = {}
): Stripe.Event {
  const session = {
    id: 'cs_test_' + Math.random().toString(36).substring(7),
    object: 'checkout.session',
    status: 'complete',
    payment_status: 'paid',
    amount_total: 10000,
    currency: 'usd',
    metadata: {},
    ...sessionData,
  }

  return createMockWebhookEvent('checkout.session.completed', session)
}

/**
 * Create a checkout.session.expired webhook event
 */
export function createCheckoutSessionExpiredEvent(
  sessionData: Partial<Stripe.Checkout.Session> = {}
): Stripe.Event {
  const session = {
    id: 'cs_test_' + Math.random().toString(36).substring(7),
    object: 'checkout.session',
    status: 'expired',
    payment_status: 'unpaid',
    amount_total: 10000,
    currency: 'usd',
    metadata: {},
    ...sessionData,
  }

  return createMockWebhookEvent('checkout.session.expired', session)
}

/**
 * Create a charge.refunded webhook event
 */
export function createChargeRefundedEvent(
  refundData: Partial<Stripe.Refund> = {}
): Stripe.Event {
  const refund = {
    id: 're_' + Math.random().toString(36).substring(7),
    object: 'refund',
    amount: 10000,
    currency: 'usd',
    payment_intent: 'pi_test_123',
    status: 'succeeded',
    ...refundData,
  }

  return createMockWebhookEvent('charge.refunded', refund)
}

/**
 * Generate a mock webhook signature header
 */
export function createWebhookSignature(
  timestamp: number = Math.floor(Date.now() / 1000)
): string {
  // This is a mock signature - in real tests we'd use Stripe's actual signing
  const mockSignature = 'mock_signature_' + Math.random().toString(36).substring(7)
  return `t=${timestamp},v1=${mockSignature}`
}

/**
 * Create a webhook request object
 */
export function createWebhookRequest(
  body: string | Record<string, unknown>,
  signature?: string
) {
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    rawBody,
    headers: {
      'stripe-signature': signature || createWebhookSignature(),
      'content-type': 'application/json',
    },
  }
}
