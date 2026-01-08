import type { Payments } from 'razorpay/dist/types/payments'
import type { Refunds } from 'razorpay/dist/types/refunds'
import type { Orders } from 'razorpay/dist/types/orders'

/**
 * Razorpay webhook event structure
 */
export interface RazorpayWebhookEvent {
  entity: 'event'
  account_id: string
  event: string
  contains: string[]
  payload: {
    payment?: { entity: Payments.RazorpayPayment }
    order?: { entity: Orders.RazorpayOrder }
    refund?: { entity: Refunds.RazorpayRefund }
  }
  created_at: number
}

/**
 * Create a mock webhook event
 */
export function createMockWebhookEvent(
  event: string,
  payload: RazorpayWebhookEvent['payload'],
  overrides: Partial<RazorpayWebhookEvent> = {}
): RazorpayWebhookEvent {
  const now = Math.floor(Date.now() / 1000)

  return {
    entity: 'event',
    account_id: 'acc_' + Math.random().toString(36).substring(7),
    event,
    contains: Object.keys(payload),
    payload,
    created_at: now,
    ...overrides,
  }
}

/**
 * Create a payment.captured webhook event
 */
export function createPaymentCapturedEvent(
  paymentData: Partial<Payments.RazorpayPayment> = {}
): RazorpayWebhookEvent {
  const payment: Payments.RazorpayPayment = {
    id: 'pay_' + Math.random().toString(36).substring(7),
    entity: 'payment',
    amount: 10000,
    currency: 'INR',
    status: 'captured',
    order_id: 'order_' + Math.random().toString(36).substring(7),
    invoice_id: null,
    international: false,
    method: 'card',
    amount_refunded: 0,
    refund_status: null,
    captured: true,
    description: 'Test payment',
    email: 'test@example.com',
    contact: '+919876543210',
    fee: 200,
    tax: 36,
    error_code: null,
    error_description: null,
    notes: {},
    created_at: Math.floor(Date.now() / 1000),
    ...paymentData,
  } as Payments.RazorpayPayment

  return createMockWebhookEvent('payment.captured', { payment: { entity: payment } })
}

/**
 * Create a payment.failed webhook event
 */
export function createPaymentFailedEvent(
  paymentData: Partial<Payments.RazorpayPayment> = {}
): RazorpayWebhookEvent {
  const payment: Payments.RazorpayPayment = {
    id: 'pay_' + Math.random().toString(36).substring(7),
    entity: 'payment',
    amount: 10000,
    currency: 'INR',
    status: 'failed',
    order_id: 'order_' + Math.random().toString(36).substring(7),
    invoice_id: null,
    international: false,
    method: 'card',
    amount_refunded: 0,
    refund_status: null,
    captured: false,
    description: 'Test payment',
    email: 'test@example.com',
    contact: '+919876543210',
    fee: 0,
    tax: 0,
    error_code: 'BAD_REQUEST_ERROR',
    error_description: 'Payment failed due to insufficient funds',
    notes: {},
    created_at: Math.floor(Date.now() / 1000),
    ...paymentData,
  } as Payments.RazorpayPayment

  return createMockWebhookEvent('payment.failed', { payment: { entity: payment } })
}

/**
 * Create an order.paid webhook event
 */
export function createOrderPaidEvent(
  orderData: Partial<Orders.RazorpayOrder> = {}
): RazorpayWebhookEvent {
  const order: Orders.RazorpayOrder = {
    id: 'order_' + Math.random().toString(36).substring(7),
    entity: 'order',
    amount: 10000,
    amount_paid: 10000,
    amount_due: 0,
    currency: 'INR',
    receipt: 'rcpt_' + Math.random().toString(36).substring(7),
    offer_id: null,
    status: 'paid',
    attempts: 1,
    notes: {},
    created_at: Math.floor(Date.now() / 1000),
    ...orderData,
  } as Orders.RazorpayOrder

  return createMockWebhookEvent('order.paid', { order: { entity: order } })
}

/**
 * Create a refund.processed webhook event
 */
export function createRefundProcessedEvent(
  refundData: Partial<Refunds.RazorpayRefund> = {}
): RazorpayWebhookEvent {
  const refund: Refunds.RazorpayRefund = {
    id: 'rfnd_' + Math.random().toString(36).substring(7),
    entity: 'refund',
    amount: 10000,
    currency: 'INR',
    payment_id: 'pay_' + Math.random().toString(36).substring(7),
    notes: {},
    receipt: null,
    acquirer_data: {},
    created_at: Math.floor(Date.now() / 1000),
    batch_id: null,
    status: 'processed',
    speed_processed: 'normal',
    speed_requested: 'normal',
    ...refundData,
  } as Refunds.RazorpayRefund

  return createMockWebhookEvent('refund.processed', { refund: { entity: refund } })
}

/**
 * Create a refund.failed webhook event
 */
export function createRefundFailedEvent(
  refundData: Partial<Refunds.RazorpayRefund> = {}
): RazorpayWebhookEvent {
  const refund: Refunds.RazorpayRefund = {
    id: 'rfnd_' + Math.random().toString(36).substring(7),
    entity: 'refund',
    amount: 10000,
    currency: 'INR',
    payment_id: 'pay_' + Math.random().toString(36).substring(7),
    notes: {},
    receipt: null,
    acquirer_data: {},
    created_at: Math.floor(Date.now() / 1000),
    batch_id: null,
    status: 'failed',
    speed_processed: 'normal',
    speed_requested: 'normal',
    ...refundData,
  } as Refunds.RazorpayRefund

  return createMockWebhookEvent('refund.failed', { refund: { entity: refund } })
}

/**
 * Generate a mock webhook signature header
 */
export function createWebhookSignature(): string {
  // This is a mock signature - in real tests we'd use Razorpay's actual signing
  return 'mock_signature_' + Math.random().toString(36).substring(7)
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
      'x-razorpay-signature': signature || createWebhookSignature(),
      'content-type': 'application/json',
    },
  }
}
