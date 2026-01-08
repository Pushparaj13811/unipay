import Razorpay from 'razorpay'
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils'
import {
  PaymentGatewayAdapter,
  PaymentProvider,
  AdapterCapabilities,
  AdapterCapability,
  CreatePaymentInput,
  CreatePaymentResult,
  HostedCheckoutResult,
  SdkCheckoutResult,
  Payment,
  Refund,
  RefundList,
  CreateRefundInput,
  WebhookRequest,
  WebhookConfig,
  WebhookVerificationResult,
  WebhookEvent,
  PaymentStatus,
  RefundStatus,
  WebhookEventType,
  createUnipayId,
  PaymentCreationError,
  PaymentNotFoundError,
  PaymentRetrievalError,
  RefundCreationError,
  RefundNotFoundError,
  WebhookParsingError,
  MissingRequiredFieldError
} from '@unipay/core'
import type { Orders } from 'razorpay/dist/types/orders'
import type { PaymentLinks } from 'razorpay/dist/types/paymentLink'
import type { Payments } from 'razorpay/dist/types/payments'
import type { Refunds } from 'razorpay/dist/types/refunds'

/**
 * Configuration options for RazorpayAdapter
 */
export interface RazorpayAdapterConfig {
  /**
   * Razorpay Key ID
   * Format: rzp_test_... or rzp_live_...
   */
  keyId: string

  /**
   * Razorpay Key Secret
   */
  keySecret: string
}

/**
 * Razorpay payment gateway adapter
 *
 * Implements UniPay's PaymentGatewayAdapter interface for Razorpay.
 * Supports both Payment Links (hosted) and Orders (SDK) modes.
 *
 * @example
 * const razorpay = new RazorpayAdapter({
 *   keyId: 'rzp_test_...',
 *   keySecret: '...'
 * })
 *
 * const client = createPaymentClient({
 *   adapters: [razorpay],
 *   webhookConfigs: [{
 *     provider: PaymentProvider.RAZORPAY,
 *     signingSecret: 'webhook_secret'
 *   }]
 * })
 */
export class RazorpayAdapter implements PaymentGatewayAdapter {
  readonly provider = PaymentProvider.RAZORPAY

  readonly capabilities: AdapterCapabilities = {
    provider: PaymentProvider.RAZORPAY,
    capabilities: new Set([
      AdapterCapability.HOSTED_CHECKOUT,
      AdapterCapability.SDK_CHECKOUT,
      AdapterCapability.PARTIAL_REFUND,
      AdapterCapability.FULL_REFUND,
      AdapterCapability.MULTIPLE_REFUNDS,
      AdapterCapability.WEBHOOKS,
      AdapterCapability.PAYMENT_RETRIEVAL,
      AdapterCapability.METADATA,
      AdapterCapability.MULTI_CURRENCY,
      AdapterCapability.CARDS,
      AdapterCapability.UPI,
      AdapterCapability.NET_BANKING,
      AdapterCapability.WALLETS
    ]),
    supportedCurrencies: [
      'INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED', 'AUD', 'CAD', 'CNY', 'HKD',
      'JPY', 'MYR', 'NZD', 'PHP', 'SAR', 'SEK', 'THB', 'ZAR'
    ],
    limits: {
      minAmount: 100, // 1 INR in paise
      maxAmount: 50000000, // 5 lakh INR in paise
      maxMetadataKeys: 15,
      maxMetadataValueLength: 256
    }
  }

  private razorpay: Razorpay
  private keyId: string

  constructor(config: RazorpayAdapterConfig) {
    this.keyId = config.keyId
    this.razorpay = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret
    })
  }

  /**
   * Create a payment session
   *
   * For hosted checkout (Payment Links), customer email or phone is required.
   * For SDK checkout (Orders), customer info is optional.
   */
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const preferSdk = input.preferredCheckoutMode === 'sdk'

    try {
      if (preferSdk) {
        return await this.createOrder(input)
      }
      return await this.createPaymentLink(input)
    } catch (error) {
      if (error instanceof PaymentCreationError || error instanceof MissingRequiredFieldError) {
        throw error
      }
      throw new PaymentCreationError(
        error instanceof Error ? error.message : 'Payment creation failed',
        {
          provider: this.provider,
          cause: error instanceof Error ? error : undefined
        }
      )
    }
  }

  /**
   * Create a Payment Link for hosted checkout
   *
   * Note: Razorpay requires customer details (at least email or phone) for Payment Links.
   * If customer info is not provided, this method will fall back to Orders API.
   */
  private async createPaymentLink(
    input: CreatePaymentInput
  ): Promise<HostedCheckoutResult> {
    // Razorpay Payment Links require customer details
    // If not provided, throw an error suggesting SDK checkout mode
    if (!input.customer?.email && !input.customer?.phone) {
      throw new MissingRequiredFieldError(
        'customer.email or customer.phone (Razorpay Payment Links require customer email or phone. ' +
        'Either provide customer details or use SDK checkout mode with preferredCheckoutMode: "sdk")'
      )
    }

    // Build the payment link create params using SDK types
    const params: PaymentLinks.RazorpayPaymentLinkCreateRequestBody = {
      amount: input.money.amount,
      currency: input.money.currency.toUpperCase(),
      description: input.description || 'Payment',
      callback_url: input.successUrl,
      callback_method: 'get',
      // Customer is required for Payment Links
      customer: {
        name: input.customer?.name || '',
        email: input.customer?.email,
        contact: input.customer?.phone
      }
    }

    // Add notes (metadata)
    if (input.metadata) {
      params.notes = input.metadata
    }

    // Add order reference
    if (input.orderId) {
      params.reference_id = input.orderId
    }

    // Add expiry
    if (input.expiresInSeconds) {
      params.expire_by = Math.floor(Date.now() / 1000) + input.expiresInSeconds
    }

    const paymentLink = await this.razorpay.paymentLink.create(params)

    return {
      checkoutMode: 'hosted',
      provider: this.provider,
      providerPaymentId: paymentLink.id,
      unipayId: createUnipayId(this.provider, paymentLink.id),
      status: this.mapPaymentLinkStatus(paymentLink.status),
      checkoutUrl: paymentLink.short_url,
      expiresAt: paymentLink.expire_by ? new Date(paymentLink.expire_by * 1000) : undefined,
      metadata: input.metadata,
      raw: paymentLink
    }
  }

  /**
   * Create an Order for SDK checkout
   *
   * Orders don't require customer information - it can be collected
   * in the frontend via Razorpay.js checkout modal.
   */
  private async createOrder(input: CreatePaymentInput): Promise<SdkCheckoutResult> {
    const params: Orders.RazorpayOrderCreateRequestBody = {
      amount: input.money.amount,
      currency: input.money.currency.toUpperCase(),
      receipt: input.orderId || `rcpt_${Date.now()}`,
      notes: input.metadata || {}
    }

    const order = await this.razorpay.orders.create(params)

    return {
      checkoutMode: 'sdk',
      provider: this.provider,
      providerPaymentId: order.id,
      unipayId: createUnipayId(this.provider, order.id),
      status: this.mapOrderStatus(order.status),
      sdkPayload: {
        orderId: order.id,
        amount: typeof order.amount === 'string' ? parseInt(order.amount, 10) : order.amount,
        currency: order.currency,
        providerData: {
          keyId: this.keyId,
          name: input.description || 'Payment',
          prefill: input.customer ? {
            name: input.customer.name,
            email: input.customer.email,
            contact: input.customer.phone
          } : undefined,
          notes: input.metadata
        }
      },
      metadata: input.metadata,
      raw: order
    }
  }

  /**
   * Retrieve payment details
   */
  async getPayment(providerPaymentId: string): Promise<Payment> {
    try {
      // Determine the type of ID
      if (providerPaymentId.startsWith('plink_')) {
        return await this.getPaymentLink(providerPaymentId)
      } else if (providerPaymentId.startsWith('order_')) {
        return await this.getOrder(providerPaymentId)
      } else if (providerPaymentId.startsWith('pay_')) {
        return await this.getPaymentById(providerPaymentId)
      }

      // Try order first, then payment link
      try {
        return await this.getOrder(providerPaymentId)
      } catch {
        try {
          return await this.getPaymentLink(providerPaymentId)
        } catch {
          return await this.getPaymentById(providerPaymentId)
        }
      }
    } catch (error) {
      if (error instanceof PaymentNotFoundError) throw error
      throw new PaymentRetrievalError(
        providerPaymentId,
        error instanceof Error ? error.message : 'Failed to retrieve payment',
        {
          provider: this.provider,
          cause: error instanceof Error ? error : undefined
        }
      )
    }
  }

  private async getPaymentLink(paymentLinkId: string): Promise<Payment> {
    const paymentLink = await this.razorpay.paymentLink.fetch(paymentLinkId) as PaymentLinks.RazorpayPaymentLink

    // Normalize amount to number
    const amount = typeof paymentLink.amount === 'string'
      ? parseInt(paymentLink.amount, 10)
      : paymentLink.amount

    // Normalize created_at - can be string or number depending on SDK version
    const createdAtTimestamp = typeof paymentLink.created_at === 'string'
      ? parseInt(paymentLink.created_at, 10)
      : paymentLink.created_at
    const createdAt = new Date(createdAtTimestamp * 1000)

    return {
      provider: this.provider,
      providerPaymentId: paymentLink.id,
      unipayId: createUnipayId(this.provider, paymentLink.id),
      status: this.mapPaymentLinkStatus(paymentLink.status),
      money: {
        amount,
        currency: paymentLink.currency || 'INR'
      },
      createdAt,
      updatedAt: createdAt,
      customer: paymentLink.customer ? {
        name: paymentLink.customer.name,
        email: paymentLink.customer.email,
        phone: paymentLink.customer.contact != null ? String(paymentLink.customer.contact) : undefined
      } : undefined,
      metadata: paymentLink.notes as Record<string, string> | undefined,
      raw: paymentLink
    }
  }

  private async getOrder(orderId: string): Promise<Payment> {
    const order = await this.razorpay.orders.fetch(orderId) as Orders.RazorpayOrder

    // Try to get payments for this order
    let payment: Payments.RazorpayPayment | undefined
    try {
      const payments = await this.razorpay.orders.fetchPayments(orderId)
      if (payments.items && payments.items.length > 0) {
        payment = payments.items[0] as Payments.RazorpayPayment
      }
    } catch {
      // No payments yet
    }

    const amount = typeof order.amount === 'string' ? parseInt(order.amount, 10) : order.amount

    return {
      provider: this.provider,
      providerPaymentId: order.id,
      unipayId: createUnipayId(this.provider, order.id),
      status: this.mapOrderStatus(order.status),
      money: {
        amount,
        currency: order.currency
      },
      amountRefunded: payment?.amount_refunded ?? 0,
      createdAt: new Date(order.created_at * 1000),
      updatedAt: new Date(order.created_at * 1000),
      capturedAt: order.status === 'paid' ? new Date(order.created_at * 1000) : undefined,
      customer: payment ? {
        email: payment.email,
        phone: payment.contact != null ? String(payment.contact) : undefined
      } : undefined,
      metadata: order.notes as Record<string, string> | undefined,
      failureReason: payment?.error_description ?? undefined,
      failureCode: payment?.error_code ?? undefined,
      raw: { order, payment }
    }
  }

  private async getPaymentById(paymentId: string): Promise<Payment> {
    const payment = await this.razorpay.payments.fetch(paymentId) as Payments.RazorpayPayment

    // Normalize amount to number (SDK types allow string | number)
    const amount = typeof payment.amount === 'string'
      ? parseInt(payment.amount, 10)
      : payment.amount

    return {
      provider: this.provider,
      providerPaymentId: payment.id,
      unipayId: createUnipayId(this.provider, payment.id),
      status: this.mapPaymentStatus(payment.status),
      money: {
        amount,
        currency: payment.currency
      },
      amountRefunded: payment.amount_refunded ?? 0,
      createdAt: new Date(payment.created_at * 1000),
      updatedAt: new Date(payment.created_at * 1000),
      capturedAt: payment.captured ? new Date(payment.created_at * 1000) : undefined,
      customer: {
        email: payment.email,
        phone: payment.contact != null ? String(payment.contact) : undefined
      },
      metadata: payment.notes as Record<string, string> | undefined,
      failureReason: payment.error_description ?? undefined,
      failureCode: payment.error_code ?? undefined,
      raw: payment
    }
  }

  /**
   * Create a refund
   */
  async createRefund(
    providerPaymentId: string,
    input?: CreateRefundInput
  ): Promise<Refund> {
    try {
      // Get the payment ID if we have an order ID
      let paymentId = providerPaymentId

      if (providerPaymentId.startsWith('order_')) {
        const payments = await this.razorpay.orders.fetchPayments(providerPaymentId)
        if (!payments.items || payments.items.length === 0) {
          throw new RefundCreationError(
            'No payment found for this order',
            { provider: this.provider }
          )
        }
        paymentId = payments.items[0].id
      } else if (providerPaymentId.startsWith('plink_')) {
        // For payment links, we need to find the associated payment
        throw new RefundCreationError(
          'Refunds for payment links must use the payment ID (pay_...)',
          { provider: this.provider }
        )
      }

      const params: Refunds.RazorpayRefundCreateRequestBody = {}

      if (input?.amount) {
        params.amount = input.amount
      }

      if (input?.metadata) {
        params.notes = input.metadata
      }

      const refund = await this.razorpay.payments.refund(paymentId, params) as Refunds.RazorpayRefund

      return {
        provider: this.provider,
        providerRefundId: refund.id,
        providerPaymentId: providerPaymentId,
        unipayId: createUnipayId(this.provider, refund.id),
        status: this.mapRefundStatus(refund.status),
        money: {
          amount: refund.amount ?? 0,
          currency: refund.currency
        },
        createdAt: new Date(refund.created_at * 1000),
        reason: input?.reason,
        raw: refund
      }
    } catch (error) {
      if (error instanceof RefundCreationError) throw error
      throw new RefundCreationError(
        error instanceof Error ? error.message : 'Refund creation failed',
        {
          provider: this.provider,
          cause: error instanceof Error ? error : undefined
        }
      )
    }
  }

  /**
   * Get refund details
   */
  async getRefund(providerRefundId: string): Promise<Refund> {
    try {
      const refund = await this.razorpay.refunds.fetch(providerRefundId) as Refunds.RazorpayRefund

      return {
        provider: this.provider,
        providerRefundId: refund.id,
        providerPaymentId: refund.payment_id,
        unipayId: createUnipayId(this.provider, refund.id),
        status: this.mapRefundStatus(refund.status),
        money: {
          amount: refund.amount ?? 0,
          currency: refund.currency
        },
        createdAt: new Date(refund.created_at * 1000),
        raw: refund
      }
    } catch {
      throw new RefundNotFoundError(providerRefundId, this.provider)
    }
  }

  /**
   * List refunds for a payment
   */
  async listRefunds(providerPaymentId: string): Promise<RefundList> {
    // Get payment ID if we have an order
    let paymentId = providerPaymentId

    if (providerPaymentId.startsWith('order_')) {
      const payments = await this.razorpay.orders.fetchPayments(providerPaymentId)
      if (payments.items && payments.items.length > 0) {
        paymentId = payments.items[0].id
      } else {
        return { refunds: [], hasMore: false }
      }
    }

    const refundsResponse = await this.razorpay.payments.fetchMultipleRefund(paymentId, {})
    const refunds = refundsResponse.items as Refunds.RazorpayRefund[]

    return {
      refunds: (refunds || []).map((refund): Refund => ({
        provider: this.provider,
        providerRefundId: refund.id,
        providerPaymentId: providerPaymentId,
        unipayId: createUnipayId(this.provider, refund.id),
        status: this.mapRefundStatus(refund.status),
        money: {
          amount: refund.amount ?? 0,
          currency: refund.currency
        },
        createdAt: new Date(refund.created_at * 1000),
        raw: refund
      })),
      hasMore: false
    }
  }

  /**
   * Verify webhook signature using Razorpay SDK's built-in method
   *
   * Uses the official validateWebhookSignature utility from the SDK
   * which implements HMAC-SHA256 verification.
   */
  verifyWebhookSignature(
    request: WebhookRequest,
    config: WebhookConfig
  ): WebhookVerificationResult {
    const signature = request.headers['x-razorpay-signature']

    if (!signature) {
      return { isValid: false, error: 'Missing x-razorpay-signature header' }
    }

    const sigString = Array.isArray(signature) ? signature[0] : signature

    try {
      // Use SDK's built-in signature verification
      const isValid = validateWebhookSignature(
        request.rawBody,
        sigString,
        config.signingSecret
      )

      if (!isValid) {
        return { isValid: false, error: 'Signature mismatch' }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Signature verification failed'
      }
    }
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(request: WebhookRequest): WebhookEvent {
    try {
      const body = JSON.parse(request.rawBody)

      return {
        provider: this.provider,
        eventType: this.mapWebhookEventType(body.event),
        providerEventId: body.payload?.payment?.entity?.id || body.payload?.refund?.entity?.id || `evt_${Date.now()}`,
        providerEventType: body.event,
        timestamp: new Date(body.created_at * 1000),
        payload: this.parseWebhookPayload(body),
        raw: body
      }
    } catch (error) {
      throw new WebhookParsingError(
        this.provider,
        error instanceof Error ? error.message : 'Unknown error',
        error instanceof Error ? error : undefined
      )
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private mapPaymentLinkStatus(status: string): PaymentStatus {
    switch (status) {
      case 'created':
        return PaymentStatus.CREATED
      case 'paid':
        return PaymentStatus.SUCCEEDED
      case 'partially_paid':
        return PaymentStatus.PENDING
      case 'expired':
        return PaymentStatus.EXPIRED
      case 'cancelled':
        return PaymentStatus.CANCELLED
      default:
        return PaymentStatus.PENDING
    }
  }

  private mapOrderStatus(status: string): PaymentStatus {
    switch (status) {
      case 'created':
        return PaymentStatus.CREATED
      case 'attempted':
        return PaymentStatus.PENDING
      case 'paid':
        return PaymentStatus.SUCCEEDED
      default:
        return PaymentStatus.PENDING
    }
  }

  private mapPaymentStatus(status: string): PaymentStatus {
    switch (status) {
      case 'created':
        return PaymentStatus.CREATED
      case 'authorized':
        return PaymentStatus.PENDING
      case 'captured':
        return PaymentStatus.SUCCEEDED
      case 'refunded':
        return PaymentStatus.SUCCEEDED
      case 'failed':
        return PaymentStatus.FAILED
      default:
        return PaymentStatus.PENDING
    }
  }

  private mapRefundStatus(status: string): RefundStatus {
    switch (status) {
      case 'pending':
        return RefundStatus.PENDING
      case 'processed':
        return RefundStatus.SUCCEEDED
      case 'failed':
        return RefundStatus.FAILED
      default:
        return RefundStatus.PENDING
    }
  }

  private mapWebhookEventType(eventType: string): WebhookEventType {
    switch (eventType) {
      case 'payment.authorized':
        return WebhookEventType.PAYMENT_PENDING
      case 'payment.captured':
        return WebhookEventType.PAYMENT_SUCCEEDED
      case 'payment.failed':
        return WebhookEventType.PAYMENT_FAILED
      case 'order.paid':
        return WebhookEventType.PAYMENT_SUCCEEDED
      case 'refund.created':
        return WebhookEventType.REFUND_CREATED
      case 'refund.processed':
        return WebhookEventType.REFUND_SUCCEEDED
      case 'refund.failed':
        return WebhookEventType.REFUND_FAILED
      default:
        return WebhookEventType.UNKNOWN
    }
  }

  private parseWebhookPayload(body: Record<string, unknown>): WebhookEvent['payload'] {
    const event = body.event as string
    const payload = body.payload as Record<string, { entity: Record<string, unknown> }> | undefined

    if (!payload) {
      return { type: 'unknown', data: body }
    }

    // Payment events
    if (event.startsWith('payment.') || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity
      if (paymentEntity) {
        // Safely extract payment fields
        const amount = typeof paymentEntity.amount === 'number'
          ? paymentEntity.amount
          : typeof paymentEntity.amount === 'string'
            ? parseInt(paymentEntity.amount, 10)
            : 0

        return {
          type: 'payment',
          providerPaymentId: String(paymentEntity.id ?? ''),
          status: this.mapPaymentStatus(String(paymentEntity.status ?? '')),
          money: {
            amount,
            currency: String(paymentEntity.currency ?? 'INR')
          },
          metadata: paymentEntity.notes as Record<string, string> | undefined,
          failureReason: paymentEntity.error_description != null
            ? String(paymentEntity.error_description)
            : undefined,
          failureCode: paymentEntity.error_code != null
            ? String(paymentEntity.error_code)
            : undefined
        }
      }

      // For order.paid, check order entity
      const orderEntity = payload.order?.entity
      if (orderEntity) {
        const amount = typeof orderEntity.amount === 'number'
          ? orderEntity.amount
          : typeof orderEntity.amount === 'string'
            ? parseInt(orderEntity.amount, 10)
            : 0

        return {
          type: 'payment',
          providerPaymentId: String(orderEntity.id ?? ''),
          status: PaymentStatus.SUCCEEDED,
          money: {
            amount,
            currency: String(orderEntity.currency ?? 'INR')
          },
          metadata: orderEntity.notes as Record<string, string> | undefined
        }
      }
    }

    // Refund events
    if (event.startsWith('refund.')) {
      const refundEntity = payload.refund?.entity
      if (refundEntity) {
        return {
          type: 'refund',
          providerRefundId: String(refundEntity.id ?? ''),
          providerPaymentId: String(refundEntity.payment_id ?? ''),
          status: this.mapRefundStatus(String(refundEntity.status ?? '')),
          money: {
            amount: typeof refundEntity.amount === 'number' ? refundEntity.amount : 0,
            currency: String(refundEntity.currency ?? 'INR')
          }
        }
      }
    }

    // Unknown event
    return {
      type: 'unknown',
      data: payload
    }
  }
}
