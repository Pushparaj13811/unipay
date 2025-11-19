import Stripe from 'stripe'
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
  WebhookParsingError
} from '@unipay/core'

/**
 * Configuration options for StripeAdapter
 */
export interface StripeAdapterConfig {
  /**
   * Stripe secret API key
   * Format: sk_test_... or sk_live_...
   */
  secretKey: string

  /**
   * Optional Stripe API version
   * If not specified, the SDK's default version will be used.
   */
  apiVersion?: Stripe.LatestApiVersion

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * Max network retries
   * @default 2
   */
  maxNetworkRetries?: number
}

/**
 * Stripe payment gateway adapter
 *
 * Implements UniPay's PaymentGatewayAdapter interface for Stripe.
 * Supports both Checkout Sessions (hosted) and Payment Intents (SDK) modes.
 *
 * @example
 * const stripe = new StripeAdapter({
 *   secretKey: 'sk_test_...'
 * })
 *
 * const client = createPaymentClient({
 *   adapters: [stripe],
 *   webhookConfigs: [{
 *     provider: PaymentProvider.STRIPE,
 *     signingSecret: 'whsec_...'
 *   }]
 * })
 */
export class StripeAdapter implements PaymentGatewayAdapter {
  readonly provider = PaymentProvider.STRIPE

  readonly capabilities: AdapterCapabilities = {
    provider: PaymentProvider.STRIPE,
    capabilities: new Set([
      AdapterCapability.HOSTED_CHECKOUT,
      AdapterCapability.SDK_CHECKOUT,
      AdapterCapability.PARTIAL_REFUND,
      AdapterCapability.FULL_REFUND,
      AdapterCapability.MULTIPLE_REFUNDS,
      AdapterCapability.WEBHOOKS,
      AdapterCapability.PAYMENT_RETRIEVAL,
      AdapterCapability.METADATA,
      AdapterCapability.IDEMPOTENCY,
      AdapterCapability.MULTI_CURRENCY,
      AdapterCapability.CARDS,
      AdapterCapability.WALLETS
    ]),
    supportedCurrencies: [
      'USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD',
      'NZD', 'SGD', 'SEK', 'DKK', 'NOK', 'MXN', 'BRL', 'PLN', 'CZK', 'HUF',
      'ILS', 'MYR', 'PHP', 'THB', 'ZAR', 'AED', 'SAR', 'KRW', 'TWD', 'VND'
    ],
    limits: {
      minAmount: 50, // 50 cents USD equivalent
      maxAmount: 99999999,
      maxMetadataKeys: 50,
      maxMetadataValueLength: 500
    }
  }

  private stripe: Stripe

  constructor(config: StripeAdapterConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion,
      timeout: config.timeout || 30000,
      maxNetworkRetries: config.maxNetworkRetries ?? 2
    })
  }

  /**
   * Create a payment session using Stripe Checkout
   */
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const preferSdk = input.preferredCheckoutMode === 'sdk'

    try {
      if (preferSdk) {
        return await this.createPaymentIntent(input)
      }
      return await this.createCheckoutSession(input)
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new PaymentCreationError(
          error.message,
          {
            provider: this.provider,
            providerCode: error.code,
            cause: error
          }
        )
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
   * Create a Checkout Session for hosted checkout
   */
  private async createCheckoutSession(
    input: CreatePaymentInput
  ): Promise<HostedCheckoutResult> {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: [
        {
          price_data: {
            currency: input.money.currency.toLowerCase(),
            unit_amount: input.money.amount,
            product_data: {
              name: input.description || 'Payment'
            }
          },
          quantity: 1
        }
      ],
      metadata: input.metadata || {},
      client_reference_id: input.orderId
    }

    // Add customer email if provided
    if (input.customer?.email) {
      params.customer_email = input.customer.email
    }

    // Set expiry if provided
    if (input.expiresInSeconds) {
      params.expires_at = Math.floor(Date.now() / 1000) + input.expiresInSeconds
    }

    const options: Stripe.RequestOptions = {}
    if (input.idempotencyKey) {
      options.idempotencyKey = input.idempotencyKey
    }

    const session = await this.stripe.checkout.sessions.create(params, options)

    return {
      checkoutMode: 'hosted',
      provider: this.provider,
      providerPaymentId: session.id,
      unipayId: createUnipayId(this.provider, session.id),
      status: this.mapSessionStatus(session.status, session.payment_status),
      checkoutUrl: session.url!,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
      metadata: input.metadata,
      raw: session
    }
  }

  /**
   * Create a Payment Intent for SDK checkout
   */
  private async createPaymentIntent(
    input: CreatePaymentInput
  ): Promise<SdkCheckoutResult> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: input.money.amount,
      currency: input.money.currency.toLowerCase(),
      metadata: input.metadata || {},
      description: input.description,
      automatic_payment_methods: {
        enabled: true
      }
    }

    // Add customer if provided
    if (input.customer?.email) {
      params.receipt_email = input.customer.email
    }

    const options: Stripe.RequestOptions = {}
    if (input.idempotencyKey) {
      options.idempotencyKey = input.idempotencyKey
    }

    const paymentIntent = await this.stripe.paymentIntents.create(params, options)

    return {
      checkoutMode: 'sdk',
      provider: this.provider,
      providerPaymentId: paymentIntent.id,
      unipayId: createUnipayId(this.provider, paymentIntent.id),
      status: this.mapPaymentIntentStatus(paymentIntent.status),
      sdkPayload: {
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      },
      metadata: input.metadata,
      raw: paymentIntent
    }
  }

  /**
   * Retrieve payment details
   */
  async getPayment(providerPaymentId: string): Promise<Payment> {
    try {
      // Determine if it's a checkout session or payment intent
      if (providerPaymentId.startsWith('cs_')) {
        return await this.getCheckoutSession(providerPaymentId)
      } else if (providerPaymentId.startsWith('pi_')) {
        return await this.getPaymentIntent(providerPaymentId)
      }

      // Try both
      try {
        return await this.getCheckoutSession(providerPaymentId)
      } catch {
        return await this.getPaymentIntent(providerPaymentId)
      }
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        if (error.code === 'resource_missing') {
          throw new PaymentNotFoundError(providerPaymentId, this.provider)
        }
        throw new PaymentRetrievalError(
          providerPaymentId,
          error.message,
          {
            provider: this.provider,
            providerCode: error.code,
            cause: error
          }
        )
      }
      throw error
    }
  }

  private async getCheckoutSession(sessionId: string): Promise<Payment> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer']
    })

    const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null

    return {
      provider: this.provider,
      providerPaymentId: session.id,
      unipayId: createUnipayId(this.provider, session.id),
      status: this.mapSessionStatus(session.status, session.payment_status),
      money: {
        amount: session.amount_total || 0,
        currency: session.currency?.toUpperCase() || 'USD'
      },
      amountRefunded: 0, // Note: PaymentIntent doesn't track refunds directly, refunds are on the Charge object
      createdAt: new Date(session.created * 1000),
      updatedAt: new Date(session.created * 1000),
      capturedAt: session.payment_status === 'paid'
        ? new Date(session.created * 1000)
        : undefined,
      customer: session.customer_details ? {
        email: session.customer_details.email || undefined,
        name: session.customer_details.name || undefined,
        phone: session.customer_details.phone || undefined
      } : undefined,
      metadata: session.metadata as Record<string, string>,
      raw: session
    }
  }

  private async getPaymentIntent(paymentIntentId: string): Promise<Payment> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)

    return {
      provider: this.provider,
      providerPaymentId: paymentIntent.id,
      unipayId: createUnipayId(this.provider, paymentIntent.id),
      status: this.mapPaymentIntentStatus(paymentIntent.status),
      money: {
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase()
      },
      amountRefunded: 0, // Note: PaymentIntent doesn't track refunds directly, need to fetch from Charge
      createdAt: new Date(paymentIntent.created * 1000),
      updatedAt: new Date(paymentIntent.created * 1000),
      capturedAt: paymentIntent.status === 'succeeded'
        ? new Date(paymentIntent.created * 1000)
        : undefined,
      customer: paymentIntent.receipt_email ? {
        email: paymentIntent.receipt_email
      } : undefined,
      metadata: paymentIntent.metadata as Record<string, string>,
      failureReason: paymentIntent.last_payment_error?.message,
      failureCode: paymentIntent.last_payment_error?.code,
      raw: paymentIntent
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
      // Get the payment intent ID from checkout session if needed
      let paymentIntentId = providerPaymentId

      if (providerPaymentId.startsWith('cs_')) {
        const session = await this.stripe.checkout.sessions.retrieve(providerPaymentId)
        if (!session.payment_intent) {
          throw new RefundCreationError(
            'Cannot refund: no payment intent associated with this session',
            { provider: this.provider }
          )
        }
        paymentIntentId = session.payment_intent as string
      }

      const params: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId
      }

      if (input?.amount) {
        params.amount = input.amount
      }

      if (input?.reason) {
        // Map to Stripe's allowed reasons
        if (['duplicate', 'fraudulent', 'requested_by_customer'].includes(input.reason)) {
          params.reason = input.reason as Stripe.RefundCreateParams.Reason
        }
      }

      if (input?.metadata) {
        params.metadata = input.metadata
      }

      const options: Stripe.RequestOptions = {}
      if (input?.idempotencyKey) {
        options.idempotencyKey = input.idempotencyKey
      }

      const refund = await this.stripe.refunds.create(params, options)

      // Get the payment intent for currency info
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)

      return {
        provider: this.provider,
        providerRefundId: refund.id,
        providerPaymentId: providerPaymentId,
        unipayId: createUnipayId(this.provider, refund.id),
        status: this.mapRefundStatus(refund.status),
        money: {
          amount: refund.amount,
          currency: paymentIntent.currency.toUpperCase()
        },
        createdAt: new Date(refund.created * 1000),
        reason: input?.reason,
        failureReason: refund.failure_reason || undefined,
        raw: refund
      }
    } catch (error) {
      if (error instanceof RefundCreationError) throw error
      if (error instanceof Stripe.errors.StripeError) {
        throw new RefundCreationError(
          error.message,
          {
            provider: this.provider,
            providerCode: error.code,
            cause: error
          }
        )
      }
      throw error
    }
  }

  /**
   * Get refund details
   */
  async getRefund(providerRefundId: string): Promise<Refund> {
    try {
      const refund = await this.stripe.refunds.retrieve(providerRefundId)

      // Get payment intent for additional info
      const paymentIntentId = refund.payment_intent as string
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)

      return {
        provider: this.provider,
        providerRefundId: refund.id,
        providerPaymentId: paymentIntentId,
        unipayId: createUnipayId(this.provider, refund.id),
        status: this.mapRefundStatus(refund.status),
        money: {
          amount: refund.amount,
          currency: paymentIntent.currency.toUpperCase()
        },
        createdAt: new Date(refund.created * 1000),
        reason: refund.reason || undefined,
        failureReason: refund.failure_reason || undefined,
        raw: refund
      }
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        if (error.code === 'resource_missing') {
          throw new RefundNotFoundError(providerRefundId, this.provider)
        }
      }
      throw error
    }
  }

  /**
   * List refunds for a payment
   */
  async listRefunds(providerPaymentId: string): Promise<RefundList> {
    // Get payment intent ID if checkout session
    let paymentIntentId = providerPaymentId

    if (providerPaymentId.startsWith('cs_')) {
      const session = await this.stripe.checkout.sessions.retrieve(providerPaymentId)
      paymentIntentId = session.payment_intent as string
    }

    const refunds = await this.stripe.refunds.list({
      payment_intent: paymentIntentId,
      limit: 100
    })

    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)

    return {
      refunds: refunds.data.map((refund) => ({
        provider: this.provider,
        providerRefundId: refund.id,
        providerPaymentId: providerPaymentId,
        unipayId: createUnipayId(this.provider, refund.id),
        status: this.mapRefundStatus(refund.status),
        money: {
          amount: refund.amount,
          currency: paymentIntent.currency.toUpperCase()
        },
        createdAt: new Date(refund.created * 1000),
        reason: refund.reason || undefined,
        failureReason: refund.failure_reason || undefined,
        raw: refund
      })),
      hasMore: refunds.has_more
    }
  }

  /**
   * Verify webhook signature using Stripe SDK's built-in method
   *
   * Uses the official stripe.webhooks.signature.verifyHeader() method
   * which implements proper HMAC-SHA256 verification with timestamp validation.
   */
  verifyWebhookSignature(
    request: WebhookRequest,
    config: WebhookConfig
  ): WebhookVerificationResult {
    const signature = request.headers['stripe-signature']

    if (!signature) {
      return { isValid: false, error: 'Missing stripe-signature header' }
    }

    const sigString = Array.isArray(signature) ? signature[0] : signature

    try {
      // Use SDK's built-in signature verification
      // Default tolerance is 300 seconds (5 minutes) if not specified
      const isValid = this.stripe.webhooks.signature.verifyHeader(
        request.rawBody,
        sigString,
        config.signingSecret,
        config.timestampToleranceSeconds || 300
      )

      if (!isValid) {
        return { isValid: false, error: 'Signature mismatch' }
      }

      return { isValid: true }
    } catch (error) {
      // Stripe SDK throws StripeSignatureVerificationError for verification failures
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        return { isValid: false, error: error.message }
      }
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
      const body = JSON.parse(request.rawBody) as Stripe.Event

      return {
        provider: this.provider,
        eventType: this.mapWebhookEventType(body.type),
        providerEventId: body.id,
        providerEventType: body.type,
        timestamp: new Date(body.created * 1000),
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

  private mapSessionStatus(
    status: Stripe.Checkout.Session.Status | null,
    paymentStatus: Stripe.Checkout.Session.PaymentStatus | null
  ): PaymentStatus {
    if (status === 'expired') return PaymentStatus.EXPIRED
    if (paymentStatus === 'paid') return PaymentStatus.SUCCEEDED
    if (paymentStatus === 'unpaid') return PaymentStatus.PENDING
    if (status === 'complete') return PaymentStatus.SUCCEEDED
    if (status === 'open') return PaymentStatus.CREATED
    return PaymentStatus.PENDING
  }

  private mapPaymentIntentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
    switch (status) {
      case 'succeeded':
        return PaymentStatus.SUCCEEDED
      case 'processing':
        return PaymentStatus.PROCESSING
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return PaymentStatus.REQUIRES_ACTION
      case 'canceled':
        return PaymentStatus.CANCELLED
      case 'requires_capture':
        return PaymentStatus.PENDING
      default:
        return PaymentStatus.PENDING
    }
  }

  private mapRefundStatus(status: string | null): RefundStatus {
    switch (status) {
      case 'succeeded':
        return RefundStatus.SUCCEEDED
      case 'pending':
        return RefundStatus.PENDING
      case 'failed':
        return RefundStatus.FAILED
      case 'canceled':
        return RefundStatus.FAILED
      default:
        return RefundStatus.PENDING
    }
  }

  private mapWebhookEventType(eventType: string): WebhookEventType {
    switch (eventType) {
      case 'checkout.session.completed':
        return WebhookEventType.PAYMENT_SUCCEEDED
      case 'checkout.session.expired':
        return WebhookEventType.PAYMENT_EXPIRED
      case 'payment_intent.succeeded':
        return WebhookEventType.PAYMENT_SUCCEEDED
      case 'payment_intent.payment_failed':
        return WebhookEventType.PAYMENT_FAILED
      case 'payment_intent.canceled':
        return WebhookEventType.PAYMENT_CANCELLED
      case 'payment_intent.processing':
        return WebhookEventType.PAYMENT_PROCESSING
      case 'payment_intent.created':
        return WebhookEventType.PAYMENT_CREATED
      case 'charge.refunded':
        return WebhookEventType.REFUND_SUCCEEDED
      case 'refund.created':
        return WebhookEventType.REFUND_CREATED
      case 'refund.updated':
        return WebhookEventType.REFUND_PROCESSING
      case 'refund.failed':
        return WebhookEventType.REFUND_FAILED
      default:
        return WebhookEventType.UNKNOWN
    }
  }

  private parseWebhookPayload(event: Stripe.Event): WebhookEvent['payload'] {
    const eventType = event.type

    // Checkout session events
    if (eventType.startsWith('checkout.session.')) {
      const session = event.data.object as Stripe.Checkout.Session
      return {
        type: 'payment',
        providerPaymentId: session.id,
        status: this.mapSessionStatus(session.status, session.payment_status),
        money: {
          amount: session.amount_total || 0,
          currency: session.currency?.toUpperCase() || 'USD'
        },
        metadata: session.metadata as Record<string, string>
      }
    }

    // Payment intent events
    if (eventType.startsWith('payment_intent.')) {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      return {
        type: 'payment',
        providerPaymentId: paymentIntent.id,
        status: this.mapPaymentIntentStatus(paymentIntent.status),
        money: {
          amount: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase()
        },
        metadata: paymentIntent.metadata as Record<string, string>,
        failureReason: paymentIntent.last_payment_error?.message,
        failureCode: paymentIntent.last_payment_error?.code
      }
    }

    // Refund events
    if (eventType.startsWith('refund.') || eventType === 'charge.refunded') {
      if (eventType === 'charge.refunded') {
        const charge = event.data.object as Stripe.Charge
        const refund = charge.refunds?.data[0]
        if (refund) {
          return {
            type: 'refund',
            providerRefundId: refund.id,
            providerPaymentId: charge.payment_intent as string || charge.id,
            status: this.mapRefundStatus(refund.status),
            money: {
              amount: refund.amount,
              currency: charge.currency.toUpperCase()
            }
          }
        }
      } else {
        const refund = event.data.object as Stripe.Refund
        return {
          type: 'refund',
          providerRefundId: refund.id,
          providerPaymentId: refund.payment_intent as string || '',
          status: this.mapRefundStatus(refund.status),
          money: {
            amount: refund.amount,
            currency: refund.currency.toUpperCase()
          },
          failureReason: refund.failure_reason || undefined
        }
      }
    }

    // Unknown event
    return {
      type: 'unknown',
      data: event.data.object
    }
  }
}
