/**
 * Razorpay Integration Tests
 *
 * These tests run against the REAL Razorpay API using test mode keys.
 * They validate end-to-end functionality and catch issues that mocks can't detect.
 *
 * Prerequisites:
 * - RAZORPAY_KEY_ID: Razorpay test key ID (rzp_test_...)
 * - RAZORPAY_KEY_SECRET: Razorpay test key secret
 * - RAZORPAY_WEBHOOK_SECRET: Razorpay webhook signing secret
 *
 * Run with: pnpm test:integration
 *
 * IMPORTANT: These tests create REAL resources in your Razorpay test account.
 * They use test mode, so no real money is involved.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { RazorpayAdapter } from '../razorpay.adapter'
import {
  PaymentProvider,
  PaymentStatus,
  MissingRequiredFieldError,
  CheckoutMode,
} from '@uniipay/core'

// Skip all tests if no API key is provided
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET

const skipIfNoCredentials = !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET
  ? describe.skip
  : describe

skipIfNoCredentials('Razorpay Integration Tests', () => {
  let adapter: RazorpayAdapter
  let createdOrderId: string | undefined
  let createdPaymentLinkId: string | undefined

  beforeAll(() => {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are required')
    }

    adapter = new RazorpayAdapter({
      keyId: RAZORPAY_KEY_ID,
      keySecret: RAZORPAY_KEY_SECRET,
    })
  })

  afterAll(() => {
    // Cleanup would go here if needed
    // Note: Razorpay test resources don't need cleanup
  })

  describe('Adapter Configuration', () => {
    it('should have correct provider identifier', () => {
      expect(adapter.provider).toBe(PaymentProvider.RAZORPAY)
    })

    it('should declare expected capabilities', () => {
      expect(adapter.capabilities.supportedCurrencies).toContain('INR')
      expect(adapter.capabilities.supportedCurrencies).toContain('USD')
      expect(adapter.capabilities.supportedCurrencies).toContain('EUR')
    })
  })

  describe('Order Creation (SDK Mode)', () => {
    it('should create an order with minimal input', async () => {
      const result = await adapter.createPayment({
        money: { amount: 50000, currency: 'INR' }, // ₹500
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        preferredCheckoutMode: CheckoutMode.SDK,
      })

      expect(result.provider).toBe(PaymentProvider.RAZORPAY)
      expect(result.checkoutMode).toBe('sdk')
      expect(result.providerPaymentId).toMatch(/^order_/)
      expect(result.unipayId).toMatch(/^razorpay:order_/)
      expect(result.status).toBe(PaymentStatus.CREATED)

      if (result.checkoutMode === 'sdk') {
        expect(result.sdkPayload.orderId).toBe(result.providerPaymentId)
        expect(result.sdkPayload.amount).toBe(50000)
        expect(result.sdkPayload.currency).toBe('INR')
        expect(result.sdkPayload.providerData?.keyId).toBe(RAZORPAY_KEY_ID)
      }

      createdOrderId = result.providerPaymentId
    }, 30000)

    it('should create an order with full input', async () => {
      const result = await adapter.createPayment({
        money: { amount: 100000, currency: 'INR' }, // ₹1000
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        preferredCheckoutMode: CheckoutMode.SDK,
        orderId: `receipt-${Date.now()}`,
        metadata: {
          internalOrderId: `test-order-${Date.now()}`,
          testRun: 'integration',
        },
        customer: {
          email: 'integration@example.com',
          name: 'Integration Test',
          phone: '+919876543210',
        },
      })

      expect(result.provider).toBe(PaymentProvider.RAZORPAY)
      expect(result.checkoutMode).toBe('sdk')
      expect(result.metadata?.testRun).toBe('integration')

      if (result.checkoutMode === 'sdk') {
        const prefill = result.sdkPayload.providerData?.prefill as { email?: string; name?: string } | undefined
        expect(prefill?.email).toBe('integration@example.com')
        expect(prefill?.name).toBe('Integration Test')
      }
    }, 30000)

    it('should handle different currencies', async () => {
      // Razorpay supports multiple currencies
      const currencies = ['INR', 'USD']

      for (const currency of currencies) {
        const amount = currency === 'INR' ? 50000 : 1000 // ₹500 or $10

        const result = await adapter.createPayment({
          money: { amount, currency },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          preferredCheckoutMode: CheckoutMode.SDK,
        })

        expect(result.provider).toBe(PaymentProvider.RAZORPAY)
        expect(result.providerPaymentId).toMatch(/^order_/)
      }
    }, 60000)
  })

  describe('Payment Link Creation (Hosted Mode)', () => {
    it('should create a payment link with customer info', async () => {
      const result = await adapter.createPayment({
        money: { amount: 75000, currency: 'INR' }, // ₹750
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customer: {
          email: 'paymentlink@example.com',
          phone: '+919876543210',
          name: 'Payment Link Test',
        },
        metadata: {
          testRun: 'integration-plink',
        },
      })

      expect(result.provider).toBe(PaymentProvider.RAZORPAY)
      expect(result.checkoutMode).toBe('hosted')
      expect(result.providerPaymentId).toMatch(/^plink_/)
      expect(result.status).toBe(PaymentStatus.CREATED)

      if (result.checkoutMode === 'hosted') {
        expect(result.checkoutUrl).toMatch(/^https:\/\/rzp\.io\//)
      }

      createdPaymentLinkId = result.providerPaymentId
    }, 30000)

    it('should throw error when customer info is missing for payment link', async () => {
      await expect(
        adapter.createPayment({
          money: { amount: 50000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          // No customer info - should fail for hosted mode
        })
      ).rejects.toThrow(MissingRequiredFieldError)
    }, 30000)

    it('should create payment link with expiry', async () => {
      const result = await adapter.createPayment({
        money: { amount: 50000, currency: 'INR' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customer: {
          email: 'expiry@example.com',
          phone: '+919876543210',
        },
        expiresInSeconds: 3600, // 1 hour
      })

      expect(result.checkoutMode).toBe('hosted')
      expect(result.expiresAt).toBeInstanceOf(Date)

      // Expiry should be roughly 1 hour from now
      const oneHourFromNow = Date.now() + 3600 * 1000
      const expiryTime = result.expiresAt!.getTime()
      expect(expiryTime).toBeGreaterThan(Date.now())
      expect(expiryTime).toBeLessThanOrEqual(oneHourFromNow + 60000) // Allow 1 minute buffer
    }, 30000)
  })

  describe('Payment Retrieval', () => {
    it('should retrieve a created order', async () => {
      if (!createdOrderId) {
        // Create an order first
        const createResult = await adapter.createPayment({
          money: { amount: 50000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          preferredCheckoutMode: CheckoutMode.SDK,
        })
        createdOrderId = createResult.providerPaymentId
      }

      const result = await adapter.getPayment(createdOrderId)

      expect(result.provider).toBe(PaymentProvider.RAZORPAY)
      expect(result.providerPaymentId).toBe(createdOrderId)
      expect(result.money.currency).toBe('INR')
      expect(result.createdAt).toBeInstanceOf(Date)
    }, 30000)

    it('should retrieve a created payment link', async () => {
      if (!createdPaymentLinkId) {
        // Create a payment link first
        const createResult = await adapter.createPayment({
          money: { amount: 50000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          customer: {
            email: 'retrieve@example.com',
            phone: '+919876543210',
          },
        })
        createdPaymentLinkId = createResult.providerPaymentId
      }

      const result = await adapter.getPayment(createdPaymentLinkId)

      expect(result.provider).toBe(PaymentProvider.RAZORPAY)
      expect(result.providerPaymentId).toBe(createdPaymentLinkId)
      expect(result.createdAt).toBeInstanceOf(Date)
    }, 30000)

    it('should throw error for non-existent order', async () => {
      await expect(
        adapter.getPayment('order_nonexistent12345')
      ).rejects.toThrow()
    }, 30000)
  })

  describe('Refund Operations', () => {
    // Note: To test refunds, we'd need a completed payment
    // In test mode without real card/UPI details, we can't complete payments
    // So we test the error cases instead

    it('should fail to refund an unpaid order', async () => {
      // Create an order (won't be paid)
      const createResult = await adapter.createPayment({
        money: { amount: 50000, currency: 'INR' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        preferredCheckoutMode: CheckoutMode.SDK,
      })

      // Attempt to refund - should fail because no payment exists
      await expect(
        adapter.createRefund(createResult.providerPaymentId)
      ).rejects.toThrow()
    }, 30000)
  })

  describe('Error Handling', () => {
    it('should handle invalid API keys gracefully', async () => {
      const badAdapter = new RazorpayAdapter({
        keyId: 'rzp_test_invalid',
        keySecret: 'invalid_secret',
      })

      await expect(
        badAdapter.createPayment({
          money: { amount: 50000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          preferredCheckoutMode: CheckoutMode.SDK,
        })
      ).rejects.toThrow()
    }, 30000)

    it('should handle amount below minimum', async () => {
      // Razorpay minimum is ₹1 (100 paise)
      await expect(
        adapter.createPayment({
          money: { amount: 50, currency: 'INR' }, // ₹0.50 - below minimum
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          preferredCheckoutMode: CheckoutMode.SDK,
        })
      ).rejects.toThrow()
    }, 30000)

    it('should handle invalid currency', async () => {
      await expect(
        adapter.createPayment({
          money: { amount: 50000, currency: 'INVALID' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          preferredCheckoutMode: CheckoutMode.SDK,
        })
      ).rejects.toThrow()
    }, 30000)
  })

  describe('Webhook Verification (with real secret)', () => {
    it('should reject invalid webhook signature', () => {
      if (!RAZORPAY_WEBHOOK_SECRET) {
        console.warn('Skipping webhook test - no RAZORPAY_WEBHOOK_SECRET')
        return
      }

      const result = adapter.verifyWebhookSignature(
        {
          rawBody: '{"test": true}',
          headers: { 'x-razorpay-signature': 'invalidsignature' },
        },
        {
          provider: PaymentProvider.RAZORPAY,
          signingSecret: RAZORPAY_WEBHOOK_SECRET,
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
          money: { amount: 50000 + i * 1000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          preferredCheckoutMode: CheckoutMode.SDK,
          metadata: { batchIndex: String(i) },
        })
      )

      // All should succeed
      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach((result, i) => {
        expect(result.provider).toBe(PaymentProvider.RAZORPAY)
        expect(result.metadata?.batchIndex).toBe(String(i))
      })
    }, 60000)
  })

  describe('Notes/Metadata Handling', () => {
    it('should preserve metadata in order creation', async () => {
      const metadata = {
        customerId: 'cust_123',
        productId: 'prod_456',
        source: 'integration_test',
      }

      const result = await adapter.createPayment({
        money: { amount: 50000, currency: 'INR' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        preferredCheckoutMode: CheckoutMode.SDK,
        metadata,
      })

      // Retrieve and verify metadata is preserved
      const retrieved = await adapter.getPayment(result.providerPaymentId)

      expect(retrieved.metadata?.customerId).toBe('cust_123')
      expect(retrieved.metadata?.productId).toBe('prod_456')
      expect(retrieved.metadata?.source).toBe('integration_test')
    }, 30000)
  })
})
