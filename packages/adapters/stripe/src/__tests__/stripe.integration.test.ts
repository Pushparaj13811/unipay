/**
 * Stripe Integration Tests
 *
 * These tests run against the REAL Stripe API using test mode keys.
 * They validate end-to-end functionality and catch issues that mocks can't detect.
 *
 * Prerequisites:
 * - STRIPE_TEST_KEY: Stripe test secret key (sk_test_...)
 * - STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret (whsec_...)
 *
 * Run with: pnpm test:integration
 *
 * IMPORTANT: These tests create REAL resources in your Stripe test account.
 * They use test mode, so no real money is involved.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { StripeAdapter } from '../stripe.adapter'
import {
  PaymentProvider,
  PaymentStatus,
  RefundStatus,
  CheckoutMode,
} from '@uniipay/core'

// Skip all tests if no API key is provided
const STRIPE_TEST_KEY = process.env.STRIPE_TEST_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

const skipIfNoCredentials = !STRIPE_TEST_KEY
  ? describe.skip
  : describe

skipIfNoCredentials('Stripe Integration Tests', () => {
  let adapter: StripeAdapter
  let createdPaymentId: string | undefined
  let createdRefundId: string | undefined

  beforeAll(() => {
    if (!STRIPE_TEST_KEY) {
      throw new Error('STRIPE_TEST_KEY environment variable is required')
    }

    adapter = new StripeAdapter({
      secretKey: STRIPE_TEST_KEY,
    })
  })

  afterAll(() => {
    // Cleanup would go here if needed
    // Note: Stripe test resources don't need cleanup - they auto-expire
  })

  describe('Adapter Configuration', () => {
    it('should have correct provider identifier', () => {
      expect(adapter.provider).toBe(PaymentProvider.STRIPE)
    })

    it('should declare expected capabilities', () => {
      expect(adapter.capabilities.supportedCurrencies).toContain('USD')
      expect(adapter.capabilities.supportedCurrencies).toContain('EUR')
      expect(adapter.capabilities.supportedCurrencies).toContain('INR')
    })
  })

  describe('Payment Creation (Checkout Session)', () => {
    it('should create a checkout session with minimal input', async () => {
      const result = await adapter.createPayment({
        money: { amount: 1000, currency: 'USD' }, // $10.00
        successUrl: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'https://example.com/cancel',
      })

      expect(result.provider).toBe(PaymentProvider.STRIPE)
      expect(result.providerPaymentId).toMatch(/^cs_test_/)
      expect(result.unipayId).toMatch(/^stripe:cs_test_/)
      expect(result.status).toBe(PaymentStatus.PENDING)
      if (result.checkoutMode === 'hosted') {
        expect(result.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com/)
      }

      createdPaymentId = result.providerPaymentId
    }, 30000)

    it('should create a checkout session with full input', async () => {
      const result = await adapter.createPayment({
        money: { amount: 2500, currency: 'USD' }, // $25.00
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customer: {
          email: 'integration-test@example.com',
          name: 'Integration Test User',
        },
        metadata: {
          orderId: `test-order-${Date.now()}`,
          testRun: 'integration',
        },
        description: 'Integration Test Payment',
      })

      expect(result.provider).toBe(PaymentProvider.STRIPE)
      expect(result.metadata?.orderId).toMatch(/^test-order-/)
      expect(result.metadata?.testRun).toBe('integration')
    }, 30000)

    it('should handle different currencies', async () => {
      const currencies = ['EUR', 'GBP', 'INR']

      for (const currency of currencies) {
        const result = await adapter.createPayment({
          money: { amount: 1000, currency },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })

        expect(result.provider).toBe(PaymentProvider.STRIPE)
        expect(result.providerPaymentId).toMatch(/^cs_test_/)
      }
    }, 60000) // Longer timeout for multiple API calls

    it('should create a payment intent for SDK mode', async () => {
      const result = await adapter.createPayment({
        money: { amount: 5000, currency: 'USD' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        preferredCheckoutMode: 'sdk' as CheckoutMode,
      })

      expect(result.checkoutMode).toBe('sdk')
      expect(result.providerPaymentId).toMatch(/^pi_/)
      if (result.checkoutMode === 'sdk') {
        expect(result.sdkPayload.clientSecret).toMatch(/^pi_.*_secret_/)
      }
    }, 30000)
  })

  describe('Payment Retrieval', () => {
    it('should retrieve a created checkout session', async () => {
      if (!createdPaymentId) {
        // Create a payment first if we don't have one
        const createResult = await adapter.createPayment({
          money: { amount: 1000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        createdPaymentId = createResult.providerPaymentId
      }

      const result = await adapter.getPayment(createdPaymentId)

      expect(result.provider).toBe(PaymentProvider.STRIPE)
      expect(result.providerPaymentId).toBe(createdPaymentId)
      expect(result.money.currency).toBe('USD')
      expect(result.createdAt).toBeInstanceOf(Date)
    }, 30000)

    it('should throw error for non-existent payment', async () => {
      await expect(
        adapter.getPayment('cs_test_nonexistent_session_id')
      ).rejects.toThrow()
    }, 30000)
  })

  describe('Payment Intent Operations', () => {
    let paymentIntentId: string

    it('should create and retrieve a payment intent', async () => {
      // Create in SDK mode to get a PaymentIntent
      const createResult = await adapter.createPayment({
        money: { amount: 3000, currency: 'USD' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        preferredCheckoutMode: 'sdk' as CheckoutMode,
      })

      paymentIntentId = createResult.providerPaymentId

      // Retrieve it
      const result = await adapter.getPayment(paymentIntentId)

      expect(result.providerPaymentId).toBe(paymentIntentId)
      expect(result.status).toBe(PaymentStatus.REQUIRES_ACTION) // requires_payment_method
      expect(result.money.amount).toBe(3000)
    }, 30000)
  })

  describe('Refund Operations', () => {
    // Note: To test refunds, we'd need a completed payment
    // In test mode without real card details, we can't complete payments
    // So we test the error cases instead

    it('should fail to refund an incomplete payment', async () => {
      // Create a payment intent (won't be paid)
      const createResult = await adapter.createPayment({
        money: { amount: 2000, currency: 'USD' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        preferredCheckoutMode: 'sdk' as CheckoutMode,
      })

      // Attempt to refund - should fail because payment isn't complete
      await expect(
        adapter.createRefund(createResult.providerPaymentId)
      ).rejects.toThrow()
    }, 30000)
  })

  describe('Error Handling', () => {
    it('should handle invalid API key gracefully', async () => {
      const badAdapter = new StripeAdapter({
        secretKey: 'sk_test_invalid_key_12345',
      })

      await expect(
        badAdapter.createPayment({
          money: { amount: 1000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow()
    }, 30000)

    it('should handle invalid amount', async () => {
      // Stripe minimum is typically $0.50 USD
      await expect(
        adapter.createPayment({
          money: { amount: 10, currency: 'USD' }, // $0.10 - below minimum
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow()
    }, 30000)

    it('should handle invalid currency', async () => {
      await expect(
        adapter.createPayment({
          money: { amount: 1000, currency: 'INVALID' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow()
    }, 30000)
  })

  describe('Webhook Verification (with real secret)', () => {
    it('should reject invalid webhook signature', () => {
      if (!STRIPE_WEBHOOK_SECRET) {
        console.warn('Skipping webhook test - no STRIPE_WEBHOOK_SECRET')
        return
      }

      const result = adapter.verifyWebhookSignature(
        {
          rawBody: '{"test": true}',
          headers: { 'stripe-signature': 't=123,v1=invalidsig' },
        },
        {
          provider: PaymentProvider.STRIPE,
          signingSecret: STRIPE_WEBHOOK_SECRET,
        }
      )

      expect(result.isValid).toBe(false)
    })
  })

  describe('API Rate Limiting Resilience', () => {
    it('should handle multiple rapid requests', async () => {
      // Make several requests in quick succession
      const promises = Array.from({ length: 5 }, (_, i) =>
        adapter.createPayment({
          money: { amount: 1000 + i * 100, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          metadata: { batchIndex: String(i) },
        })
      )

      // All should succeed (Stripe has generous test rate limits)
      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach((result, i) => {
        expect(result.provider).toBe(PaymentProvider.STRIPE)
        expect(result.metadata?.batchIndex).toBe(String(i))
      })
    }, 60000)
  })
})
