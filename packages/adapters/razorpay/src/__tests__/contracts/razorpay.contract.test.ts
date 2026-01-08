/**
 * Razorpay Contract Tests
 *
 * These tests validate that our adapter correctly handles real Razorpay API
 * response shapes. They use typed fixtures that match actual API responses
 * to ensure our mapping logic works with real data structures.
 *
 * Purpose:
 * 1. Catch SDK version incompatibilities
 * 2. Validate type mappings are correct
 * 3. Ensure edge cases in real responses are handled
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RazorpayAdapter } from '../../razorpay.adapter'
import {
  PaymentProvider,
  PaymentStatus,
  RefundStatus,
  WebhookEventType,
  CheckoutMode,
} from '@unipay/core'
import {
  ORDER_CREATED,
  ORDER_ATTEMPTED,
  ORDER_PAID,
  PAYMENT_LINK_CREATED,
  PAYMENT_LINK_PAID,
  PAYMENT_LINK_EXPIRED,
  PAYMENT_LINK_CANCELLED,
  PAYMENT_CAPTURED,
  PAYMENT_AUTHORIZED,
  PAYMENT_FAILED,
  REFUND_PROCESSED,
  REFUND_PENDING,
  REFUND_LIST,
  ORDER_PAYMENTS_LIST,
  WEBHOOK_PAYMENT_CAPTURED,
  WEBHOOK_PAYMENT_AUTHORIZED,
  WEBHOOK_PAYMENT_FAILED,
  WEBHOOK_ORDER_PAID,
  WEBHOOK_REFUND_CREATED,
  WEBHOOK_REFUND_PROCESSED,
  WEBHOOK_REFUND_FAILED,
} from './razorpay-fixtures'

// Mock Razorpay SDK
vi.mock('razorpay', () => {
  const MockRazorpayCtor = vi.fn().mockImplementation(() => ({
    orders: {
      create: vi.fn(),
      fetch: vi.fn(),
      fetchPayments: vi.fn(),
    },
    paymentLink: {
      create: vi.fn(),
      fetch: vi.fn(),
    },
    payments: {
      fetch: vi.fn(),
      refund: vi.fn(),
      fetchMultipleRefund: vi.fn(),
    },
    refunds: {
      fetch: vi.fn(),
    },
  }))
  return { default: MockRazorpayCtor }
})

// Mock the webhook signature validation utility
vi.mock('razorpay/dist/utils/razorpay-utils', () => ({
  validateWebhookSignature: vi.fn().mockReturnValue(true),
}))

describe('Razorpay Contract Tests', () => {
  let adapter: RazorpayAdapter
  let mockRazorpay: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const Razorpay = (await import('razorpay')).default
    adapter = new RazorpayAdapter({
      keyId: 'rzp_test_contract',
      keySecret: 'secret_contract',
    })
    mockRazorpay = (Razorpay as any).mock.results[0].value
  })

  describe('Order Response Contracts', () => {
    it('should correctly map CREATED order status', async () => {
      mockRazorpay.orders.create.mockResolvedValue(ORDER_CREATED)

      const result = await adapter.createPayment({
        money: { amount: 50000, currency: 'INR' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        preferredCheckoutMode: CheckoutMode.SDK,
        metadata: { orderId: 'internal-order-123' },
      })

      expect(result.checkoutMode).toBe('sdk')
      expect(result.provider).toBe(PaymentProvider.RAZORPAY)
      expect(result.providerPaymentId).toBe(ORDER_CREATED.id)
      expect(result.unipayId).toBe(`razorpay:${ORDER_CREATED.id}`)
      expect(result.status).toBe(PaymentStatus.CREATED)
      if (result.checkoutMode === 'sdk') {
        expect(result.sdkPayload.orderId).toBe(ORDER_CREATED.id)
        expect(result.sdkPayload.amount).toBe(ORDER_CREATED.amount)
        expect(result.sdkPayload.currency).toBe(ORDER_CREATED.currency)
        expect(result.sdkPayload.providerData?.keyId).toBe('rzp_test_contract')
      }
    })

    it('should correctly map ATTEMPTED order status', async () => {
      mockRazorpay.orders.fetch.mockResolvedValue(ORDER_ATTEMPTED)
      mockRazorpay.orders.fetchPayments.mockResolvedValue({ items: [] })

      const result = await adapter.getPayment(ORDER_ATTEMPTED.id)

      expect(result.status).toBe(PaymentStatus.PENDING) // attempted -> PENDING
      expect(result.providerPaymentId).toBe(ORDER_ATTEMPTED.id)
    })

    it('should correctly map PAID order status', async () => {
      mockRazorpay.orders.fetch.mockResolvedValue(ORDER_PAID)
      mockRazorpay.orders.fetchPayments.mockResolvedValue(ORDER_PAYMENTS_LIST)

      const result = await adapter.getPayment(ORDER_PAID.id)

      expect(result.status).toBe(PaymentStatus.SUCCEEDED)
      expect(result.money.amount).toBe(ORDER_PAID.amount)
      expect(result.money.currency).toBe('INR')
      expect(result.capturedAt).toBeInstanceOf(Date)
    })

    it('should handle order with associated payment details', async () => {
      mockRazorpay.orders.fetch.mockResolvedValue(ORDER_PAID)
      mockRazorpay.orders.fetchPayments.mockResolvedValue(ORDER_PAYMENTS_LIST)

      const result = await adapter.getPayment(ORDER_PAID.id)

      expect(result.customer?.email).toBe(PAYMENT_CAPTURED.email)
      expect(result.customer?.phone).toBe(PAYMENT_CAPTURED.contact)
      expect(result.amountRefunded).toBe(PAYMENT_CAPTURED.amount_refunded)
    })
  })

  describe('Payment Link Response Contracts', () => {
    it('should correctly map CREATED payment link', async () => {
      mockRazorpay.paymentLink.create.mockResolvedValue(PAYMENT_LINK_CREATED)

      const result = await adapter.createPayment({
        money: { amount: 100000, currency: 'INR' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customer: {
          email: 'customer@example.com',
          phone: '+919876543210',
          name: 'Test Customer',
        },
      })

      expect(result.checkoutMode).toBe('hosted')
      expect(result.provider).toBe(PaymentProvider.RAZORPAY)
      expect(result.providerPaymentId).toBe(PAYMENT_LINK_CREATED.id)
      expect(result.status).toBe(PaymentStatus.CREATED)
      if (result.checkoutMode === 'hosted') {
        expect(result.checkoutUrl).toBe(PAYMENT_LINK_CREATED.short_url)
      }
      expect(result.expiresAt).toBeInstanceOf(Date)
    })

    it('should correctly map PAID payment link', async () => {
      mockRazorpay.paymentLink.fetch.mockResolvedValue(PAYMENT_LINK_PAID)

      const result = await adapter.getPayment(PAYMENT_LINK_PAID.id)

      expect(result.status).toBe(PaymentStatus.SUCCEEDED)
    })

    it('should correctly map EXPIRED payment link', async () => {
      mockRazorpay.paymentLink.fetch.mockResolvedValue(PAYMENT_LINK_EXPIRED)

      const result = await adapter.getPayment(PAYMENT_LINK_EXPIRED.id)

      expect(result.status).toBe(PaymentStatus.EXPIRED)
    })

    it('should correctly map CANCELLED payment link', async () => {
      mockRazorpay.paymentLink.fetch.mockResolvedValue(PAYMENT_LINK_CANCELLED)

      const result = await adapter.getPayment(PAYMENT_LINK_CANCELLED.id)

      expect(result.status).toBe(PaymentStatus.CANCELLED)
    })

    it('should handle customer details from payment link', async () => {
      mockRazorpay.paymentLink.fetch.mockResolvedValue(PAYMENT_LINK_CREATED)

      const result = await adapter.getPayment(PAYMENT_LINK_CREATED.id)

      expect(result.customer?.name).toBe(PAYMENT_LINK_CREATED.customer.name)
      expect(result.customer?.email).toBe(PAYMENT_LINK_CREATED.customer.email)
      expect(result.customer?.phone).toBe(PAYMENT_LINK_CREATED.customer.contact)
    })
  })

  describe('Payment Response Contracts', () => {
    it('should correctly map CAPTURED payment status', async () => {
      mockRazorpay.payments.fetch.mockResolvedValue(PAYMENT_CAPTURED)

      const result = await adapter.getPayment(PAYMENT_CAPTURED.id)

      expect(result.status).toBe(PaymentStatus.SUCCEEDED)
      expect(result.money.amount).toBe(PAYMENT_CAPTURED.amount)
      expect(result.money.currency).toBe('INR')
      expect(result.capturedAt).toBeInstanceOf(Date)
      expect(result.customer?.email).toBe(PAYMENT_CAPTURED.email)
    })

    it('should correctly map AUTHORIZED payment status', async () => {
      mockRazorpay.payments.fetch.mockResolvedValue(PAYMENT_AUTHORIZED)

      const result = await adapter.getPayment(PAYMENT_AUTHORIZED.id)

      expect(result.status).toBe(PaymentStatus.PENDING) // authorized -> PENDING
      expect(result.capturedAt).toBeUndefined()
    })

    it('should correctly map FAILED payment with error details', async () => {
      mockRazorpay.payments.fetch.mockResolvedValue(PAYMENT_FAILED)

      const result = await adapter.getPayment(PAYMENT_FAILED.id)

      expect(result.status).toBe(PaymentStatus.FAILED)
      expect(result.failureCode).toBe(PAYMENT_FAILED.error_code)
      expect(result.failureReason).toBe(PAYMENT_FAILED.error_description)
    })
  })

  describe('Refund Response Contracts', () => {
    it('should correctly map PROCESSED refund', async () => {
      mockRazorpay.orders.fetchPayments.mockResolvedValue(ORDER_PAYMENTS_LIST)
      mockRazorpay.payments.refund.mockResolvedValue(REFUND_PROCESSED)

      const result = await adapter.createRefund(
        ORDER_PAID.id,
        { amount: 25000, reason: 'Customer requested refund' }
      )

      expect(result.providerRefundId).toBe(REFUND_PROCESSED.id)
      expect(result.status).toBe(RefundStatus.SUCCEEDED) // processed -> SUCCEEDED
      expect(result.money.amount).toBe(REFUND_PROCESSED.amount)
      expect(result.money.currency).toBe('INR')
    })

    it('should correctly map PENDING refund', async () => {
      mockRazorpay.refunds.fetch.mockResolvedValue(REFUND_PENDING)

      const result = await adapter.getRefund(REFUND_PENDING.id)

      expect(result.status).toBe(RefundStatus.PENDING)
    })

    it('should correctly map refund list', async () => {
      mockRazorpay.orders.fetchPayments.mockResolvedValue(ORDER_PAYMENTS_LIST)
      mockRazorpay.payments.fetchMultipleRefund.mockResolvedValue(REFUND_LIST)

      const result = await adapter.listRefunds(ORDER_PAID.id)

      expect(result.refunds).toHaveLength(1)
      expect(result.refunds[0].providerRefundId).toBe(REFUND_PROCESSED.id)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('Webhook Event Response Contracts', () => {
    it('should correctly parse payment.captured event', () => {
      const rawBody = JSON.stringify(WEBHOOK_PAYMENT_CAPTURED)

      const result = adapter.parseWebhookEvent({
        rawBody,
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.PAYMENT_SUCCEEDED)
      expect(result.providerEventType).toBe('payment.captured')
      expect(result.provider).toBe(PaymentProvider.RAZORPAY)
      expect(result.payload.type).toBe('payment')
      if (result.payload.type === 'payment') {
        expect(result.payload.status).toBe(PaymentStatus.SUCCEEDED)
        expect(result.payload.providerPaymentId).toBe(PAYMENT_CAPTURED.id)
        expect(result.payload.money.amount).toBe(PAYMENT_CAPTURED.amount)
      }
    })

    it('should correctly parse payment.authorized event', () => {
      const rawBody = JSON.stringify(WEBHOOK_PAYMENT_AUTHORIZED)

      const result = adapter.parseWebhookEvent({
        rawBody,
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.PAYMENT_PENDING)
      expect(result.payload.type).toBe('payment')
      if (result.payload.type === 'payment') {
        expect(result.payload.status).toBe(PaymentStatus.PENDING)
      }
    })

    it('should correctly parse payment.failed event', () => {
      const rawBody = JSON.stringify(WEBHOOK_PAYMENT_FAILED)

      const result = adapter.parseWebhookEvent({
        rawBody,
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.PAYMENT_FAILED)
      expect(result.payload.type).toBe('payment')
      if (result.payload.type === 'payment') {
        expect(result.payload.status).toBe(PaymentStatus.FAILED)
        expect(result.payload.failureCode).toBe(PAYMENT_FAILED.error_code)
        expect(result.payload.failureReason).toBe(PAYMENT_FAILED.error_description)
      }
    })

    it('should correctly parse order.paid event', () => {
      const rawBody = JSON.stringify(WEBHOOK_ORDER_PAID)

      const result = adapter.parseWebhookEvent({
        rawBody,
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.PAYMENT_SUCCEEDED)
      expect(result.providerEventType).toBe('order.paid')
      expect(result.payload.type).toBe('payment')
      if (result.payload.type === 'payment') {
        expect(result.payload.status).toBe(PaymentStatus.SUCCEEDED)
      }
    })

    it('should correctly parse refund.created event', () => {
      const rawBody = JSON.stringify(WEBHOOK_REFUND_CREATED)

      const result = adapter.parseWebhookEvent({
        rawBody,
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.REFUND_CREATED)
      expect(result.payload.type).toBe('refund')
      if (result.payload.type === 'refund') {
        expect(result.payload.providerRefundId).toBe(REFUND_PENDING.id)
        expect(result.payload.status).toBe(RefundStatus.PENDING)
      }
    })

    it('should correctly parse refund.processed event', () => {
      const rawBody = JSON.stringify(WEBHOOK_REFUND_PROCESSED)

      const result = adapter.parseWebhookEvent({
        rawBody,
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.REFUND_SUCCEEDED)
      expect(result.payload.type).toBe('refund')
      if (result.payload.type === 'refund') {
        expect(result.payload.status).toBe(RefundStatus.SUCCEEDED)
      }
    })

    it('should correctly parse refund.failed event', () => {
      const rawBody = JSON.stringify(WEBHOOK_REFUND_FAILED)

      const result = adapter.parseWebhookEvent({
        rawBody,
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.REFUND_FAILED)
      expect(result.payload.type).toBe('refund')
      if (result.payload.type === 'refund') {
        expect(result.payload.status).toBe(RefundStatus.FAILED)
      }
    })
  })

  describe('Edge Cases from Real API', () => {
    it('should handle amount as string (some SDK versions return string)', async () => {
      const orderWithStringAmount = {
        ...ORDER_CREATED,
        amount: '50000' as any, // Some responses have string amounts
      }
      mockRazorpay.orders.fetch.mockResolvedValue(orderWithStringAmount)
      mockRazorpay.orders.fetchPayments.mockResolvedValue({ items: [] })

      const result = await adapter.getPayment(ORDER_CREATED.id)

      expect(result.money.amount).toBe(50000) // Should be normalized to number
      expect(typeof result.money.amount).toBe('number')
    })

    it('should handle created_at as string', async () => {
      const linkWithStringTimestamp = {
        ...PAYMENT_LINK_CREATED,
        created_at: '1704067200' as any,
      }
      mockRazorpay.paymentLink.fetch.mockResolvedValue(linkWithStringTimestamp)

      const result = await adapter.getPayment(PAYMENT_LINK_CREATED.id)

      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.createdAt.getTime()).toBe(1704067200 * 1000)
    })

    it('should handle metadata as empty object', async () => {
      const orderWithEmptyNotes = {
        ...ORDER_CREATED,
        notes: {},
      }
      mockRazorpay.orders.create.mockResolvedValue(orderWithEmptyNotes)

      const result = await adapter.createPayment({
        money: { amount: 50000, currency: 'INR' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        preferredCheckoutMode: CheckoutMode.SDK,
      })

      // Should not throw and metadata should be undefined or empty object
      expect(result.metadata).toEqual(undefined)
    })

    it('should handle customer contact as number', async () => {
      const linkWithNumericContact = {
        ...PAYMENT_LINK_CREATED,
        customer: {
          ...PAYMENT_LINK_CREATED.customer,
          contact: 9876543210 as any, // Some responses have numeric contact
        },
      }
      mockRazorpay.paymentLink.fetch.mockResolvedValue(linkWithNumericContact)

      const result = await adapter.getPayment(PAYMENT_LINK_CREATED.id)

      expect(result.customer?.phone).toBe('9876543210') // Should be normalized to string
    })

    it('should preserve raw response', async () => {
      mockRazorpay.orders.fetch.mockResolvedValue(ORDER_PAID)
      mockRazorpay.orders.fetchPayments.mockResolvedValue(ORDER_PAYMENTS_LIST)

      const result = await adapter.getPayment(ORDER_PAID.id)

      expect(result.raw).toHaveProperty('order')
      expect((result.raw as any).order).toEqual(ORDER_PAID)
    })

    it('should handle null currency in payment link', async () => {
      const linkWithNullCurrency = {
        ...PAYMENT_LINK_CREATED,
        currency: null as any,
      }
      mockRazorpay.paymentLink.fetch.mockResolvedValue(linkWithNullCurrency)

      const result = await adapter.getPayment(PAYMENT_LINK_CREATED.id)

      expect(result.money.currency).toBe('INR') // Should default to INR
    })
  })
})
