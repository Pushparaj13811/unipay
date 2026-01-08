/**
 * Stripe Contract Tests
 *
 * These tests validate that our adapter correctly handles real Stripe API
 * response shapes. They use typed fixtures that match actual API responses
 * to ensure our mapping logic works with real data structures.
 *
 * Purpose:
 * 1. Catch SDK version incompatibilities
 * 2. Validate type mappings are correct
 * 3. Ensure edge cases in real responses are handled
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StripeAdapter } from '../../stripe.adapter'
import {
  PaymentProvider,
  PaymentStatus,
  RefundStatus,
  WebhookEventType,
  CheckoutMode,
} from '@unipay/core'
import {
  CHECKOUT_SESSION_OPEN,
  CHECKOUT_SESSION_COMPLETE,
  CHECKOUT_SESSION_EXPIRED,
  PAYMENT_INTENT_REQUIRES_PM,
  PAYMENT_INTENT_SUCCEEDED,
  REFUND_SUCCEEDED,
  REFUND_PENDING,
  REFUND_LIST,
  WEBHOOK_EVENT_SESSION_COMPLETED,
  WEBHOOK_EVENT_PI_SUCCEEDED,
  WEBHOOK_EVENT_REFUND_CREATED,
} from './stripe-fixtures'

// Mock Stripe SDK with proper error classes
vi.mock('stripe', () => {
  // Define error classes inside the factory to avoid hoisting issues
  class MockStripeError extends Error {
    code?: string
    constructor(message: string) {
      super(message)
      this.name = 'StripeError'
    }
  }

  class MockStripeSignatureVerificationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'StripeSignatureVerificationError'
    }
  }

  const MockStripeCtor = vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
      retrieve: vi.fn(),
      list: vi.fn(),
    },
    webhooks: {
      signature: {
        verifyHeader: vi.fn(),
      },
    },
  }))

  // Add static errors property to constructor
  Object.defineProperty(MockStripeCtor, 'errors', {
    value: {
      StripeError: MockStripeError,
      StripeSignatureVerificationError: MockStripeSignatureVerificationError,
    },
    writable: false,
    enumerable: true,
    configurable: false
  })

  return { default: MockStripeCtor }
})

describe('Stripe Contract Tests', () => {
  let adapter: StripeAdapter
  let mockStripe: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const Stripe = (await import('stripe')).default
    adapter = new StripeAdapter({
      secretKey: 'sk_test_contract',
    })
    mockStripe = (Stripe as any).mock.results[0].value
  })

  describe('Checkout Session Response Contracts', () => {
    it('should correctly map OPEN checkout session', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue(CHECKOUT_SESSION_OPEN)

      const result = await adapter.createPayment({
        money: { amount: 10000, currency: 'USD' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customer: { email: 'test@example.com' },
        metadata: { orderId: 'order-123' },
      })

      // Validate all mapped fields
      expect(result.checkoutMode).toBe('hosted')
      expect(result.provider).toBe(PaymentProvider.STRIPE)
      expect(result.providerPaymentId).toBe(CHECKOUT_SESSION_OPEN.id)
      expect(result.unipayId).toBe(`stripe:${CHECKOUT_SESSION_OPEN.id}`)
      expect(result.status).toBe(PaymentStatus.PENDING) // unpaid -> PENDING
      if (result.checkoutMode === 'hosted') {
        expect(result.checkoutUrl).toBe(CHECKOUT_SESSION_OPEN.url)
      }
      expect(result.metadata).toEqual({ orderId: 'order-123' })
    })

    it('should correctly map COMPLETE checkout session', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(CHECKOUT_SESSION_COMPLETE)

      const result = await adapter.getPayment(CHECKOUT_SESSION_COMPLETE.id)

      expect(result.status).toBe(PaymentStatus.SUCCEEDED) // complete + paid -> SUCCEEDED
      expect(result.providerPaymentId).toBe(CHECKOUT_SESSION_COMPLETE.id)
    })

    it('should correctly map EXPIRED checkout session', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(CHECKOUT_SESSION_EXPIRED)

      const result = await adapter.getPayment(CHECKOUT_SESSION_EXPIRED.id)

      expect(result.status).toBe(PaymentStatus.EXPIRED)
    })

    it('should handle session with null URL (completed state)', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue(CHECKOUT_SESSION_COMPLETE)

      const result = await adapter.createPayment({
        money: { amount: 10000, currency: 'USD' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })

      // When URL is null (completed session), adapter returns null
      // This is acceptable since completed sessions don't need checkout URLs
      if (result.checkoutMode === 'hosted') {
        expect(result.checkoutUrl).toBeNull()
      }
    })
  })

  describe('Payment Intent Response Contracts', () => {
    it('should correctly map requires_payment_method status', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue(PAYMENT_INTENT_REQUIRES_PM)

      const result = await adapter.createPayment({
        money: { amount: 10000, currency: 'USD' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        preferredCheckoutMode: 'sdk' as CheckoutMode,
      })

      expect(result.checkoutMode).toBe('sdk')
      expect(result.providerPaymentId).toBe(PAYMENT_INTENT_REQUIRES_PM.id)
      expect(result.status).toBe(PaymentStatus.REQUIRES_ACTION)
      if (result.checkoutMode === 'sdk') {
        expect(result.sdkPayload.clientSecret).toBe(PAYMENT_INTENT_REQUIRES_PM.client_secret)
      }
    })

    it('should correctly map succeeded payment intent', async () => {
      mockStripe.paymentIntents.retrieve.mockResolvedValue(PAYMENT_INTENT_SUCCEEDED)

      const result = await adapter.getPayment(PAYMENT_INTENT_SUCCEEDED.id)

      expect(result.status).toBe(PaymentStatus.SUCCEEDED)
      expect(result.money.amount).toBe(PAYMENT_INTENT_SUCCEEDED.amount)
      expect(result.money.currency).toBe('USD')
    })
  })

  describe('Refund Response Contracts', () => {
    it('should correctly map succeeded refund', async () => {
      // The adapter fetches the payment intent to get currency info
      mockStripe.paymentIntents.retrieve.mockResolvedValue(PAYMENT_INTENT_SUCCEEDED)
      mockStripe.refunds.create.mockResolvedValue(REFUND_SUCCEEDED)

      const result = await adapter.createRefund(
        REFUND_SUCCEEDED.payment_intent as string,
        { amount: 5000, reason: 'requested_by_customer' }
      )

      expect(result.providerRefundId).toBe(REFUND_SUCCEEDED.id)
      expect(result.status).toBe(RefundStatus.SUCCEEDED)
      expect(result.money.amount).toBe(REFUND_SUCCEEDED.amount)
      expect(result.money.currency).toBe('USD')
      // reason comes from input, not from Stripe response
      expect(result.reason).toBe('requested_by_customer')
    })

    it('should correctly map pending refund', async () => {
      // The adapter fetches the payment intent to get currency info
      mockStripe.paymentIntents.retrieve.mockResolvedValue(PAYMENT_INTENT_SUCCEEDED)
      mockStripe.refunds.retrieve.mockResolvedValue(REFUND_PENDING)

      const result = await adapter.getRefund(REFUND_PENDING.id)

      expect(result.status).toBe(RefundStatus.PENDING)
    })

    it('should correctly map refund list', async () => {
      mockStripe.refunds.list.mockResolvedValue(REFUND_LIST)
      mockStripe.paymentIntents.retrieve.mockResolvedValue(PAYMENT_INTENT_SUCCEEDED)

      const result = await adapter.listRefunds(PAYMENT_INTENT_SUCCEEDED.id)

      expect(result.refunds).toHaveLength(1)
      expect(result.refunds[0].providerRefundId).toBe(REFUND_SUCCEEDED.id)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('Webhook Event Response Contracts', () => {
    it('should correctly parse checkout.session.completed event', () => {
      const rawBody = JSON.stringify(WEBHOOK_EVENT_SESSION_COMPLETED)

      const result = adapter.parseWebhookEvent({
        rawBody,
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.PAYMENT_SUCCEEDED)
      expect(result.providerEventId).toBe(WEBHOOK_EVENT_SESSION_COMPLETED.id)
      expect(result.providerEventType).toBe('checkout.session.completed')
      expect(result.payload.type).toBe('payment')
      if (result.payload.type === 'payment') {
        expect(result.payload.status).toBe(PaymentStatus.SUCCEEDED)
      }
    })

    it('should correctly parse payment_intent.succeeded event', () => {
      const rawBody = JSON.stringify(WEBHOOK_EVENT_PI_SUCCEEDED)

      const result = adapter.parseWebhookEvent({
        rawBody,
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.PAYMENT_SUCCEEDED)
      expect(result.payload.type).toBe('payment')
      if (result.payload.type === 'payment') {
        expect(result.payload.providerPaymentId).toBe(PAYMENT_INTENT_SUCCEEDED.id)
        expect(result.payload.money.amount).toBe(PAYMENT_INTENT_SUCCEEDED.amount)
      }
    })

    it('should correctly parse refund.created event', () => {
      const rawBody = JSON.stringify(WEBHOOK_EVENT_REFUND_CREATED)

      const result = adapter.parseWebhookEvent({
        rawBody,
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.REFUND_CREATED)
      expect(result.payload.type).toBe('refund')
      if (result.payload.type === 'refund') {
        expect(result.payload.providerRefundId).toBe(REFUND_SUCCEEDED.id)
        expect(result.payload.status).toBe(RefundStatus.SUCCEEDED)
      }
    })
  })

  describe('Edge Cases from Real API', () => {
    it('should handle metadata as empty object', async () => {
      const sessionWithEmptyMetadata = {
        ...CHECKOUT_SESSION_OPEN,
        metadata: {},
      }
      mockStripe.checkout.sessions.create.mockResolvedValue(sessionWithEmptyMetadata)

      const result = await adapter.createPayment({
        money: { amount: 10000, currency: 'USD' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })

      // When no metadata is provided in input, result.metadata is undefined
      // This is expected behavior - the adapter passes through input metadata, not response metadata
      expect(result.metadata).toBeUndefined()
    })

    it('should handle currency case normalization', async () => {
      const sessionLowerCurrency = {
        ...CHECKOUT_SESSION_OPEN,
        currency: 'eur', // lowercase from API
      }
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(sessionLowerCurrency)

      const result = await adapter.getPayment(sessionLowerCurrency.id)

      expect(result.money.currency).toBe('EUR') // Should be uppercase
    })

    it('should handle timestamps correctly', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(CHECKOUT_SESSION_COMPLETE)

      const result = await adapter.getPayment(CHECKOUT_SESSION_COMPLETE.id)

      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.createdAt.getTime()).toBe(CHECKOUT_SESSION_COMPLETE.created * 1000)
    })

    it('should preserve raw response', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(CHECKOUT_SESSION_COMPLETE)

      const result = await adapter.getPayment(CHECKOUT_SESSION_COMPLETE.id)

      expect(result.raw).toEqual(CHECKOUT_SESSION_COMPLETE)
    })
  })
})
