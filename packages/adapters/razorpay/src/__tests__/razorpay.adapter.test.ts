import { describe, it, expect, vi, beforeEach } from 'vitest'
import Razorpay from 'razorpay'
import { RazorpayAdapter, RazorpayAdapterConfig } from '../razorpay.adapter'
import {
  PaymentProvider,
  PaymentStatus,
  RefundStatus,
  WebhookEventType,
  AdapterCapability,
  CheckoutMode,
  PaymentCreationError,
  RefundCreationError,
  MissingRequiredFieldError,
  WebhookParsingError,
} from '@uniipay/core'
import { createMockRazorpay, MockRazorpay } from './__mocks__/razorpay.mock'
import {
  createMockOrder,
  createPaidOrder,
  createMockPaymentLink,
  createPaidPaymentLink,
  createExpiredPaymentLink,
  createMockPayment,
  createCapturedPayment,
  createFailedPayment,
  createMockRefund,
  createRefundList,
  createPaymentCapturedEvent,
  createPaymentFailedEvent,
  createOrderPaidEvent,
  createRefundProcessedEvent,
  createWebhookRequest,
} from './fixtures'

// Mock the Razorpay module
vi.mock('razorpay', () => {
  const MockRazorpayCtor = vi.fn()
  return {
    default: MockRazorpayCtor,
  }
})

// Mock the validateWebhookSignature utility
vi.mock('razorpay/dist/utils/razorpay-utils', () => ({
  validateWebhookSignature: vi.fn(),
}))

// Import the mocked function for control in tests
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils'
const mockValidateWebhookSignature = vi.mocked(validateWebhookSignature)

describe('RazorpayAdapter', () => {
  let adapter: RazorpayAdapter
  let mockRazorpay: MockRazorpay
  const defaultConfig: RazorpayAdapterConfig = {
    keyId: 'rzp_test_123',
    keySecret: 'secret_123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRazorpay = createMockRazorpay()

    // Set up the Razorpay constructor mock to return our mock
    const RazorpayMock = vi.mocked(Razorpay)
    RazorpayMock.mockImplementation(() => mockRazorpay as unknown as Razorpay)

    adapter = new RazorpayAdapter(defaultConfig)
  })

  describe('constructor', () => {
    it('should create adapter with config', () => {
      expect(adapter).toBeInstanceOf(RazorpayAdapter)
      expect(adapter.provider).toBe(PaymentProvider.RAZORPAY)
    })

    it('should pass config to Razorpay SDK', () => {
      const config: RazorpayAdapterConfig = {
        keyId: 'rzp_live_456',
        keySecret: 'secret_456',
      }

      new RazorpayAdapter(config)

      expect(Razorpay).toHaveBeenCalledWith({
        key_id: 'rzp_live_456',
        key_secret: 'secret_456',
      })
    })
  })

  describe('capabilities', () => {
    it('should declare correct provider', () => {
      expect(adapter.capabilities.provider).toBe(PaymentProvider.RAZORPAY)
    })

    it('should support hosted checkout', () => {
      expect(adapter.capabilities.capabilities.has(AdapterCapability.HOSTED_CHECKOUT)).toBe(true)
    })

    it('should support SDK checkout', () => {
      expect(adapter.capabilities.capabilities.has(AdapterCapability.SDK_CHECKOUT)).toBe(true)
    })

    it('should support partial and full refunds', () => {
      expect(adapter.capabilities.capabilities.has(AdapterCapability.PARTIAL_REFUND)).toBe(true)
      expect(adapter.capabilities.capabilities.has(AdapterCapability.FULL_REFUND)).toBe(true)
    })

    it('should support webhooks', () => {
      expect(adapter.capabilities.capabilities.has(AdapterCapability.WEBHOOKS)).toBe(true)
    })

    it('should support UPI', () => {
      expect(adapter.capabilities.capabilities.has(AdapterCapability.UPI)).toBe(true)
    })

    it('should support common currencies', () => {
      const currencies = adapter.capabilities.supportedCurrencies
      expect(currencies).toContain('INR')
      expect(currencies).toContain('USD')
      expect(currencies).toContain('EUR')
    })

    it('should have correct limits', () => {
      expect(adapter.capabilities.limits?.minAmount).toBe(100) // 1 INR in paise
      expect(adapter.capabilities.limits?.maxAmount).toBe(50000000) // 5 lakh INR
    })
  })

  describe('createPayment', () => {
    describe('hosted checkout (Payment Links)', () => {
      it('should create payment link with customer email', async () => {
        const mockPaymentLink = createMockPaymentLink({
          id: 'plink_test_abc123',
          short_url: 'https://rzp.io/i/abc123',
        })
        mockRazorpay.paymentLink.create.mockResolvedValue(mockPaymentLink)

        const result = await adapter.createPayment({
          money: { amount: 10000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          customer: { email: 'test@example.com' },
        })

        expect(result.checkoutMode).toBe('hosted')
        expect(result.provider).toBe(PaymentProvider.RAZORPAY)
        expect(result.providerPaymentId).toBe('plink_test_abc123')
        expect(result.unipayId).toBe('razorpay:plink_test_abc123')
        if (result.checkoutMode === 'hosted') {
          expect(result.checkoutUrl).toBe('https://rzp.io/i/abc123')
        }
      })

      it('should create payment link with customer phone', async () => {
        const mockPaymentLink = createMockPaymentLink()
        mockRazorpay.paymentLink.create.mockResolvedValue(mockPaymentLink)

        await adapter.createPayment({
          money: { amount: 10000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          customer: { phone: '+919876543210' },
        })

        expect(mockRazorpay.paymentLink.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: expect.objectContaining({
              contact: '+919876543210',
            }),
          })
        )
      })

      it('should throw MissingRequiredFieldError without customer info', async () => {
        await expect(
          adapter.createPayment({
            money: { amount: 10000, currency: 'INR' },
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
          })
        ).rejects.toThrow(MissingRequiredFieldError)
      })

      it('should include metadata as notes', async () => {
        const mockPaymentLink = createMockPaymentLink()
        mockRazorpay.paymentLink.create.mockResolvedValue(mockPaymentLink)

        await adapter.createPayment({
          money: { amount: 10000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          customer: { email: 'test@example.com' },
          metadata: { orderId: 'order-123' },
        })

        expect(mockRazorpay.paymentLink.create).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: { orderId: 'order-123' },
          })
        )
      })

      it('should map created status correctly', async () => {
        const mockPaymentLink = createMockPaymentLink({ status: 'created' })
        mockRazorpay.paymentLink.create.mockResolvedValue(mockPaymentLink)

        const result = await adapter.createPayment({
          money: { amount: 10000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          customer: { email: 'test@example.com' },
        })

        expect(result.status).toBe(PaymentStatus.CREATED)
      })
    })

    describe('SDK checkout (Orders)', () => {
      it('should create order when preferredCheckoutMode is sdk', async () => {
        const mockOrder = createMockOrder({
          id: 'order_test_abc123',
          amount: 10000,
          currency: 'INR',
        })
        mockRazorpay.orders.create.mockResolvedValue(mockOrder)

        const result = await adapter.createPayment({
          money: { amount: 10000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          preferredCheckoutMode: CheckoutMode.SDK,
        })

        expect(result.checkoutMode).toBe('sdk')
        expect(result.provider).toBe(PaymentProvider.RAZORPAY)
        expect(result.providerPaymentId).toBe('order_test_abc123')
        expect(result.unipayId).toBe('razorpay:order_test_abc123')
        expect('sdkPayload' in result && result.sdkPayload?.orderId).toBe('order_test_abc123')
      })

      it('should include key ID in SDK payload', async () => {
        const mockOrder = createMockOrder()
        mockRazorpay.orders.create.mockResolvedValue(mockOrder)

        const result = await adapter.createPayment({
          money: { amount: 10000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          preferredCheckoutMode: CheckoutMode.SDK,
        })

        if ('sdkPayload' in result) {
          expect(result.sdkPayload?.providerData?.keyId).toBe('rzp_test_123')
        }
      })

      it('should not require customer info for SDK checkout', async () => {
        const mockOrder = createMockOrder()
        mockRazorpay.orders.create.mockResolvedValue(mockOrder)

        // Should not throw
        const result = await adapter.createPayment({
          money: { amount: 10000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          preferredCheckoutMode: CheckoutMode.SDK,
        })

        expect(result.checkoutMode).toBe('sdk')
      })
    })

    describe('error handling', () => {
      it('should throw PaymentCreationError on Razorpay error', async () => {
        mockRazorpay.paymentLink.create.mockRejectedValue(new Error('API error'))

        await expect(
          adapter.createPayment({
            money: { amount: 10000, currency: 'INR' },
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
            customer: { email: 'test@example.com' },
          })
        ).rejects.toThrow(PaymentCreationError)
      })
    })
  })

  describe('getPayment', () => {
    it('should retrieve payment link by plink_ prefix', async () => {
      const mockPaymentLink = createPaidPaymentLink({
        id: 'plink_test_abc123',
        amount: 10000,
        currency: 'INR',
      })
      mockRazorpay.paymentLink.fetch.mockResolvedValue(mockPaymentLink)

      const result = await adapter.getPayment('plink_test_abc123')

      expect(mockRazorpay.paymentLink.fetch).toHaveBeenCalledWith('plink_test_abc123')
      expect(result.providerPaymentId).toBe('plink_test_abc123')
      expect(result.money.amount).toBe(10000)
    })

    it('should retrieve order by order_ prefix', async () => {
      const mockOrder = createPaidOrder({
        id: 'order_test_abc123',
        amount: 10000,
      })
      mockRazorpay.orders.fetch.mockResolvedValue(mockOrder)
      mockRazorpay.orders.fetchPayments.mockResolvedValue({ items: [] })

      const result = await adapter.getPayment('order_test_abc123')

      expect(mockRazorpay.orders.fetch).toHaveBeenCalledWith('order_test_abc123')
      expect(result.providerPaymentId).toBe('order_test_abc123')
    })

    it('should retrieve payment by pay_ prefix', async () => {
      const mockPayment = createCapturedPayment({
        id: 'pay_test_abc123',
        amount: 10000,
      })
      mockRazorpay.payments.fetch.mockResolvedValue(mockPayment)

      const result = await adapter.getPayment('pay_test_abc123')

      expect(mockRazorpay.payments.fetch).toHaveBeenCalledWith('pay_test_abc123')
      expect(result.providerPaymentId).toBe('pay_test_abc123')
    })

    it('should map paid payment link to SUCCEEDED status', async () => {
      const mockPaymentLink = createPaidPaymentLink()
      mockRazorpay.paymentLink.fetch.mockResolvedValue(mockPaymentLink)

      const result = await adapter.getPayment('plink_test_123')

      expect(result.status).toBe(PaymentStatus.SUCCEEDED)
    })

    it('should map expired payment link to EXPIRED status', async () => {
      const mockPaymentLink = createExpiredPaymentLink()
      mockRazorpay.paymentLink.fetch.mockResolvedValue(mockPaymentLink)

      const result = await adapter.getPayment('plink_test_123')

      expect(result.status).toBe(PaymentStatus.EXPIRED)
    })

    it('should map paid order to SUCCEEDED status', async () => {
      const mockOrder = createPaidOrder()
      mockRazorpay.orders.fetch.mockResolvedValue(mockOrder)
      mockRazorpay.orders.fetchPayments.mockResolvedValue({ items: [] })

      const result = await adapter.getPayment('order_test_123')

      expect(result.status).toBe(PaymentStatus.SUCCEEDED)
    })

    it('should map captured payment to SUCCEEDED status', async () => {
      const mockPayment = createCapturedPayment()
      mockRazorpay.payments.fetch.mockResolvedValue(mockPayment)

      const result = await adapter.getPayment('pay_test_123')

      expect(result.status).toBe(PaymentStatus.SUCCEEDED)
    })

    it('should map failed payment to FAILED status', async () => {
      const mockPayment = createFailedPayment()
      mockRazorpay.payments.fetch.mockResolvedValue(mockPayment)

      const result = await adapter.getPayment('pay_test_123')

      expect(result.status).toBe(PaymentStatus.FAILED)
    })
  })

  describe('createRefund', () => {
    it('should create full refund for payment', async () => {
      const mockRefund = createMockRefund({
        id: 'rfnd_test_abc123',
        amount: 10000,
        payment_id: 'pay_test_123',
      })
      mockRazorpay.payments.refund.mockResolvedValue(mockRefund)

      const result = await adapter.createRefund('pay_test_123')

      expect(result.providerRefundId).toBe('rfnd_test_abc123')
      expect(result.money.amount).toBe(10000)
      expect(result.status).toBe(RefundStatus.SUCCEEDED)
    })

    it('should create partial refund', async () => {
      const mockRefund = createMockRefund({ amount: 5000 })
      mockRazorpay.payments.refund.mockResolvedValue(mockRefund)

      await adapter.createRefund('pay_test_123', { amount: 5000 })

      expect(mockRazorpay.payments.refund).toHaveBeenCalledWith(
        'pay_test_123',
        expect.objectContaining({ amount: 5000 })
      )
    })

    it('should look up payment from order', async () => {
      const mockPayments = {
        items: [createMockPayment({ id: 'pay_from_order' })],
      }
      const mockRefund = createMockRefund()

      mockRazorpay.orders.fetchPayments.mockResolvedValue(mockPayments)
      mockRazorpay.payments.refund.mockResolvedValue(mockRefund)

      await adapter.createRefund('order_test_123')

      expect(mockRazorpay.payments.refund).toHaveBeenCalledWith('pay_from_order', expect.anything())
    })

    it('should throw RefundCreationError when order has no payment', async () => {
      mockRazorpay.orders.fetchPayments.mockResolvedValue({ items: [] })

      await expect(adapter.createRefund('order_test_123')).rejects.toThrow(RefundCreationError)
    })

    it('should throw RefundCreationError for payment links', async () => {
      await expect(adapter.createRefund('plink_test_123')).rejects.toThrow(RefundCreationError)
    })

    it('should throw RefundCreationError on Razorpay error', async () => {
      mockRazorpay.payments.refund.mockRejectedValue(new Error('Refund failed'))

      await expect(adapter.createRefund('pay_test_123')).rejects.toThrow(RefundCreationError)
    })
  })

  describe('getRefund', () => {
    it('should retrieve refund details', async () => {
      const mockRefund = createMockRefund({
        id: 'rfnd_test_abc123',
        payment_id: 'pay_test_123',
      })
      mockRazorpay.refunds.fetch.mockResolvedValue(mockRefund)

      const result = await adapter.getRefund('rfnd_test_abc123')

      expect(result.providerRefundId).toBe('rfnd_test_abc123')
      expect(result.providerPaymentId).toBe('pay_test_123')
    })
  })

  describe('listRefunds', () => {
    it('should list refunds for payment', async () => {
      const mockRefunds = createRefundList([
        createMockRefund({ id: 'rfnd_1' }),
        createMockRefund({ id: 'rfnd_2' }),
      ])
      mockRazorpay.payments.fetchMultipleRefund.mockResolvedValue(mockRefunds)

      const result = await adapter.listRefunds('pay_test_123')

      expect(result.refunds).toHaveLength(2)
      expect(result.refunds[0].providerRefundId).toBe('rfnd_1')
      expect(result.refunds[1].providerRefundId).toBe('rfnd_2')
    })

    it('should lookup payment for order refunds', async () => {
      const mockPayments = {
        items: [createMockPayment({ id: 'pay_from_order' })],
      }
      const mockRefunds = createRefundList([createMockRefund()])

      mockRazorpay.orders.fetchPayments.mockResolvedValue(mockPayments)
      mockRazorpay.payments.fetchMultipleRefund.mockResolvedValue(mockRefunds)

      await adapter.listRefunds('order_test_123')

      expect(mockRazorpay.payments.fetchMultipleRefund).toHaveBeenCalledWith(
        'pay_from_order',
        expect.anything()
      )
    })

    it('should return empty list for order without payment', async () => {
      mockRazorpay.orders.fetchPayments.mockResolvedValue({ items: [] })

      const result = await adapter.listRefunds('order_test_123')

      expect(result.refunds).toHaveLength(0)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('verifyWebhookSignature', () => {
    it('should return valid for correct signature', () => {
      mockValidateWebhookSignature.mockReturnValue(true)

      const request = createWebhookRequest({ event: 'test' })
      const result = adapter.verifyWebhookSignature(request, {
        provider: PaymentProvider.RAZORPAY,
        signingSecret: 'webhook_secret',
      })

      expect(result.isValid).toBe(true)
    })

    it('should return invalid when signature header is missing', () => {
      const request = {
        rawBody: '{}',
        headers: {},
      }

      const result = adapter.verifyWebhookSignature(request, {
        provider: PaymentProvider.RAZORPAY,
        signingSecret: 'webhook_secret',
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Missing x-razorpay-signature header')
    })

    it('should return invalid when verification fails', () => {
      mockValidateWebhookSignature.mockReturnValue(false)

      const request = createWebhookRequest({ event: 'test' })
      const result = adapter.verifyWebhookSignature(request, {
        provider: PaymentProvider.RAZORPAY,
        signingSecret: 'webhook_secret',
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Signature mismatch')
    })

    it('should return invalid when verification throws', () => {
      mockValidateWebhookSignature.mockImplementation(() => {
        throw new Error('Verification failed')
      })

      const request = createWebhookRequest({ event: 'test' })
      const result = adapter.verifyWebhookSignature(request, {
        provider: PaymentProvider.RAZORPAY,
        signingSecret: 'webhook_secret',
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Verification failed')
    })
  })

  describe('parseWebhookEvent', () => {
    it('should parse payment.captured event', () => {
      const event = createPaymentCapturedEvent({
        id: 'pay_test_123',
        amount: 10000,
        currency: 'INR',
      })

      const result = adapter.parseWebhookEvent({
        rawBody: JSON.stringify(event),
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.PAYMENT_SUCCEEDED)
      expect(result.providerEventType).toBe('payment.captured')
      expect(result.payload.type).toBe('payment')
      if (result.payload.type === 'payment') {
        expect(result.payload.providerPaymentId).toBe('pay_test_123')
        expect(result.payload.money.amount).toBe(10000)
      }
    })

    it('should parse payment.failed event', () => {
      const event = createPaymentFailedEvent()

      const result = adapter.parseWebhookEvent({
        rawBody: JSON.stringify(event),
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.PAYMENT_FAILED)
      expect(result.payload.type).toBe('payment')
      if (result.payload.type === 'payment') {
        expect(result.payload.status).toBe(PaymentStatus.FAILED)
      }
    })

    it('should parse order.paid event', () => {
      const event = createOrderPaidEvent({
        id: 'order_test_123',
        amount: 10000,
      })

      const result = adapter.parseWebhookEvent({
        rawBody: JSON.stringify(event),
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.PAYMENT_SUCCEEDED)
      expect(result.payload.type).toBe('payment')
    })

    it('should parse refund.processed event', () => {
      const event = createRefundProcessedEvent({
        id: 'rfnd_test_123',
        payment_id: 'pay_test_123',
        amount: 5000,
      })

      const result = adapter.parseWebhookEvent({
        rawBody: JSON.stringify(event),
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.REFUND_SUCCEEDED)
      expect(result.payload.type).toBe('refund')
      if (result.payload.type === 'refund') {
        expect(result.payload.providerRefundId).toBe('rfnd_test_123')
        expect(result.payload.money.amount).toBe(5000)
      }
    })

    it('should handle payment event with string amount', () => {
      const event = {
        entity: 'event',
        account_id: 'acc_123',
        event: 'payment.captured',
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: 'pay_string_amount',
              amount: '7500', // String instead of number
              currency: 'INR',
              status: 'captured',
            },
          },
        },
        created_at: Math.floor(Date.now() / 1000),
      }

      const result = adapter.parseWebhookEvent({
        rawBody: JSON.stringify(event),
        headers: {},
      })

      expect(result.payload.type).toBe('payment')
      if (result.payload.type === 'payment') {
        expect(result.payload.money.amount).toBe(7500)
      }
    })

    it('should handle order.paid event with string amount', () => {
      const event = {
        entity: 'event',
        account_id: 'acc_123',
        event: 'order.paid',
        contains: ['order'],
        payload: {
          order: {
            entity: {
              id: 'order_string_amount',
              amount: '15000', // String instead of number
              currency: 'INR',
              status: 'paid',
            },
          },
        },
        created_at: Math.floor(Date.now() / 1000),
      }

      const result = adapter.parseWebhookEvent({
        rawBody: JSON.stringify(event),
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.PAYMENT_SUCCEEDED)
      expect(result.payload.type).toBe('payment')
      if (result.payload.type === 'payment') {
        expect(result.payload.money.amount).toBe(15000)
      }
    })

    it('should handle payment event with missing amount', () => {
      const event = {
        entity: 'event',
        account_id: 'acc_123',
        event: 'payment.captured',
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: 'pay_no_amount',
              currency: 'INR',
              status: 'captured',
              // amount is missing
            },
          },
        },
        created_at: Math.floor(Date.now() / 1000),
      }

      const result = adapter.parseWebhookEvent({
        rawBody: JSON.stringify(event),
        headers: {},
      })

      expect(result.payload.type).toBe('payment')
      if (result.payload.type === 'payment') {
        expect(result.payload.money.amount).toBe(0) // Default to 0
      }
    })

    it('should return UNKNOWN for unrecognized events', () => {
      const event = {
        entity: 'event',
        account_id: 'acc_123',
        event: 'customer.created',
        contains: [],
        payload: {},
        created_at: Math.floor(Date.now() / 1000),
      }

      const result = adapter.parseWebhookEvent({
        rawBody: JSON.stringify(event),
        headers: {},
      })

      expect(result.eventType).toBe(WebhookEventType.UNKNOWN)
    })

    it('should throw WebhookParsingError for invalid JSON', () => {
      expect(() =>
        adapter.parseWebhookEvent({
          rawBody: 'invalid json',
          headers: {},
        })
      ).toThrow(WebhookParsingError)
    })
  })
})
