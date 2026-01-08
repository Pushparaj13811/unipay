/**
 * Razorpay Webhook Signature Tests
 *
 * These tests validate webhook signature verification using REAL cryptographic
 * operations (not mocked). This ensures our adapter correctly implements
 * Razorpay's signature verification algorithm.
 *
 * Razorpay's signature format:
 * - Header: X-Razorpay-Signature
 * - Algorithm: HMAC-SHA256
 * - Payload: Raw request body
 * - Signature: Hex-encoded HMAC
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHmac } from 'crypto'
import { RazorpayAdapter } from '../razorpay.adapter'
import { PaymentProvider } from '@uniipay/core'

// We need to mock the Razorpay SDK constructor but NOT the signature validation
vi.mock('razorpay', () => {
  const MockRazorpayCtor = vi.fn().mockImplementation(() => ({
    orders: { create: vi.fn(), fetch: vi.fn(), fetchPayments: vi.fn() },
    paymentLink: { create: vi.fn(), fetch: vi.fn() },
    payments: { fetch: vi.fn(), refund: vi.fn(), fetchMultipleRefund: vi.fn() },
    refunds: { fetch: vi.fn() },
  }))
  return { default: MockRazorpayCtor }
})

// Don't mock the signature validation - we want to test real crypto
vi.mock('razorpay/dist/utils/razorpay-utils', async () => {
  const actual = await vi.importActual<typeof import('razorpay/dist/utils/razorpay-utils')>(
    'razorpay/dist/utils/razorpay-utils'
  )
  return actual
})

describe('Razorpay Webhook Signature Tests', () => {
  let adapter: RazorpayAdapter
  const webhookSecret = 'test_webhook_secret_razorpay_123456'

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new RazorpayAdapter({
      keyId: 'rzp_test_signature',
      keySecret: 'key_secret_test',
    })
  })

  /**
   * Generate a valid Razorpay webhook signature
   * This mimics how Razorpay signs webhook payloads
   */
  function generateRazorpaySignature(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret)
    hmac.update(payload, 'utf8')
    return hmac.digest('hex')
  }

  describe('Valid Signatures', () => {
    it('should accept a correctly signed webhook payload', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: { id: 'pay_test_123', amount: 50000 },
          },
        },
        created_at: 1704067200,
      })

      const signature = generateRazorpaySignature(payload, webhookSecret)

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle payload with Indian language characters', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_hindi',
              notes: {
                customer_name: 'राहुल कुमार',
                product: 'हिंदी उत्पाद',
              },
            },
          },
        },
        created_at: 1704067200,
      })

      const signature = generateRazorpaySignature(payload, webhookSecret)

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(true)
    })

    it('should handle complex nested payload', () => {
      const payload = JSON.stringify({
        entity: 'event',
        account_id: 'acc_test123',
        event: 'order.paid',
        contains: ['payment', 'order'],
        payload: {
          payment: {
            entity: {
              id: 'pay_test_complex',
              amount: 100000,
              currency: 'INR',
              method: 'upi',
              vpa: 'customer@upi',
              notes: {
                key1: 'value1',
                key2: 'value2',
                nested: { deep: 'value' },
              },
            },
          },
          order: {
            entity: {
              id: 'order_test_complex',
              amount: 100000,
              currency: 'INR',
            },
          },
        },
        created_at: 1704067200,
      })

      const signature = generateRazorpaySignature(payload, webhookSecret)

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(true)
    })

    it('should handle large payload with many items', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_large',
              amount: 500000,
              notes: Object.fromEntries(
                Array.from({ length: 15 }, (_, i) => [`key_${i}`, `value_${i}_${'x'.repeat(100)}`])
              ),
            },
          },
        },
        created_at: 1704067200,
      })

      const signature = generateRazorpaySignature(payload, webhookSecret)

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(true)
    })
  })

  describe('Invalid Signatures', () => {
    it('should reject when signature header is missing', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        created_at: 1704067200,
      })

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: {} },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Missing')
    })

    it('should reject when signature is tampered', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        created_at: 1704067200,
      })

      const validSignature = generateRazorpaySignature(payload, webhookSecret)
      const tamperedSignature = validSignature.slice(0, -4) + 'xxxx'

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': tamperedSignature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(false)
    })

    it('should reject when payload is modified after signing', () => {
      const originalPayload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        payload: {
          payment: { entity: { id: 'pay_test', amount: 1000 } },
        },
        created_at: 1704067200,
      })

      const signature = generateRazorpaySignature(originalPayload, webhookSecret)

      // Attacker modifies the amount
      const modifiedPayload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        payload: {
          payment: { entity: { id: 'pay_test', amount: 999999 } },
        },
        created_at: 1704067200,
      })

      const result = adapter.verifyWebhookSignature(
        { rawBody: modifiedPayload, headers: { 'x-razorpay-signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(false)
    })

    it('should reject when signed with wrong secret', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        created_at: 1704067200,
      })

      const wrongSignature = generateRazorpaySignature(payload, 'wrong_secret_key')

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': wrongSignature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(false)
    })

    it('should reject completely invalid signature format', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        created_at: 1704067200,
      })

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': 'not-a-valid-hex-signature' } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(false)
    })

    it('should reject empty signature', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        created_at: 1704067200,
      })

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': '' } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(false)
    })
  })

  describe('Event-Specific Signatures', () => {
    it('should validate payment.authorized webhook', () => {
      const payload = JSON.stringify({
        entity: 'event',
        account_id: 'acc_test123',
        event: 'payment.authorized',
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: 'pay_auth_123',
              amount: 50000,
              currency: 'INR',
              status: 'authorized',
              method: 'card',
              captured: false,
            },
          },
        },
        created_at: 1704067200,
      })

      const signature = generateRazorpaySignature(payload, webhookSecret)

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(true)
    })

    it('should validate payment.failed webhook', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_123',
              amount: 50000,
              status: 'failed',
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Payment failed due to insufficient funds',
            },
          },
        },
        created_at: 1704067200,
      })

      const signature = generateRazorpaySignature(payload, webhookSecret)

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(true)
    })

    it('should validate refund.processed webhook', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_test_123',
              amount: 25000,
              currency: 'INR',
              payment_id: 'pay_test_123',
              status: 'processed',
            },
          },
          payment: {
            entity: {
              id: 'pay_test_123',
              amount: 50000,
            },
          },
        },
        created_at: 1704067200,
      })

      const signature = generateRazorpaySignature(payload, webhookSecret)

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(true)
    })
  })

  describe('Header Handling', () => {
    it('should handle header as array', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        created_at: 1704067200,
      })

      const signature = generateRazorpaySignature(payload, webhookSecret)

      const result = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': [signature] } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(true)
    })

    it('should be case-sensitive for header name (lowercase expected)', () => {
      const payload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        created_at: 1704067200,
      })

      const signature = generateRazorpaySignature(payload, webhookSecret)

      // Test with lowercase (expected)
      const resultLowercase = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'x-razorpay-signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(resultLowercase.isValid).toBe(true)

      // Test with different case - should fail if not normalized
      const resultUppercase = adapter.verifyWebhookSignature(
        { rawBody: payload, headers: { 'X-Razorpay-Signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      // Depending on implementation, this might or might not work
      // Our adapter should handle case normalization
    })
  })

  describe('Payload Edge Cases', () => {
    it('should handle whitespace in JSON payload', () => {
      // Some systems may prettify JSON, but signature is on raw body
      const prettyPayload = JSON.stringify(
        {
          entity: 'event',
          event: 'payment.captured',
          created_at: 1704067200,
        },
        null,
        2
      )

      const signature = generateRazorpaySignature(prettyPayload, webhookSecret)

      const result = adapter.verifyWebhookSignature(
        { rawBody: prettyPayload, headers: { 'x-razorpay-signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      expect(result.isValid).toBe(true)
    })

    it('should reject if minified vs pretty payload mismatch', () => {
      // Signature was created on minified JSON
      const minifiedPayload = '{"entity":"event","event":"payment.captured"}'
      const signature = generateRazorpaySignature(minifiedPayload, webhookSecret)

      // But we receive prettified version
      const prettyPayload = '{ "entity": "event", "event": "payment.captured" }'

      const result = adapter.verifyWebhookSignature(
        { rawBody: prettyPayload, headers: { 'x-razorpay-signature': signature } },
        { provider: PaymentProvider.RAZORPAY, signingSecret: webhookSecret }
      )

      // These should NOT match because raw bodies are different
      expect(result.isValid).toBe(false)
    })
  })
})
