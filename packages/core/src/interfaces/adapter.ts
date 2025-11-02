import { PaymentProvider } from '../enums'
import {
  CreatePaymentInput,
  CreatePaymentResult,
  Payment,
  CreateRefundInput,
  Refund,
  RefundList,
  WebhookRequest,
  WebhookVerificationResult,
  WebhookEvent,
  WebhookConfig,
  AdapterCapabilities
} from '../types'

/**
 * Contract for payment gateway adapters
 *
 * Every gateway adapter must implement this interface.
 * The orchestrator uses this to interact with any gateway
 * through a unified interface.
 *
 * ## Implementing a New Adapter
 *
 * 1. Create a class that implements PaymentGatewayAdapter
 * 2. Set the `provider` to your PaymentProvider enum value
 * 3. Declare capabilities accurately in `capabilities`
 * 4. Implement all methods, translating between UniPay types and gateway-specific formats
 * 5. Handle gateway-specific errors and wrap them in UniPay error types
 *
 * @example
 * class StripeAdapter implements PaymentGatewayAdapter {
 *   readonly provider = PaymentProvider.STRIPE
 *   readonly capabilities = {
 *     provider: PaymentProvider.STRIPE,
 *     capabilities: new Set([
 *       AdapterCapability.HOSTED_CHECKOUT,
 *       AdapterCapability.SDK_CHECKOUT,
 *       AdapterCapability.PARTIAL_REFUND,
 *       AdapterCapability.WEBHOOKS
 *     ]),
 *     supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR'],
 *     limits: { minAmount: 50 }
 *   }
 *
 *   async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
 *     // Translate to Stripe format
 *     const session = await stripe.checkout.sessions.create({
 *       line_items: [{ price_data: { ... }, quantity: 1 }],
 *       mode: 'payment',
 *       success_url: input.successUrl,
 *       cancel_url: input.cancelUrl
 *     })
 *
 *     // Translate back to UniPay format
 *     return {
 *       checkoutMode: 'hosted',
 *       provider: this.provider,
 *       providerPaymentId: session.id,
 *       unipayId: `stripe:${session.id}`,
 *       status: PaymentStatus.CREATED,
 *       checkoutUrl: session.url!,
 *       raw: session
 *     }
 *   }
 *   // ... other methods
 * }
 */
export interface PaymentGatewayAdapter {
  /**
   * Provider identifier
   *
   * Must match a value from PaymentProvider enum.
   * Used by orchestrator for routing and tracking.
   */
  readonly provider: PaymentProvider

  /**
   * Adapter capabilities declaration
   *
   * Declares what features this adapter supports.
   * Orchestrator uses this for:
   * - Routing decisions (e.g., which adapter supports INR?)
   * - Validation (e.g., does adapter support partial refunds?)
   * - Feature checks (e.g., is SDK checkout available?)
   *
   * Be accurate - declaring unsupported capabilities will cause runtime errors.
   */
  readonly capabilities: AdapterCapabilities

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create payment with this gateway
   *
   * Adapter responsibilities:
   * 1. Validate input against adapter's limits (min/max amount, etc.)
   * 2. Translate CreatePaymentInput → Gateway format
   * 3. Call gateway API
   * 4. Translate response → CreatePaymentResult
   * 5. Handle gateway-specific errors (wrap in PaymentCreationError)
   *
   * The result should include either:
   * - `checkoutMode: 'hosted'` with `checkoutUrl` for redirect-based checkout
   * - `checkoutMode: 'sdk'` with `sdkPayload` for frontend SDK integration
   *
   * @param input - Validated payment input
   * @returns Payment creation result with checkout URL or SDK credentials
   * @throws PaymentCreationError - When gateway rejects the payment
   * @throws ValidationError - When input fails adapter-specific validation
   */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>

  /**
   * Get payment from this gateway
   *
   * Retrieves current payment status and details.
   *
   * @param providerPaymentId - Gateway's payment ID (NOT UniPay ID)
   * @returns Full payment details
   * @throws PaymentNotFoundError - When payment doesn't exist
   * @throws PaymentRetrievalError - When gateway API fails
   */
  getPayment(providerPaymentId: string): Promise<Payment>

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a refund for a payment
   *
   * @param providerPaymentId - Gateway's payment ID to refund
   * @param input - Refund details (amount, reason, etc.)
   *               If amount is omitted, full refund is performed
   * @returns Refund details
   * @throws RefundCreationError - When refund fails
   * @throws PartialRefundNotSupportedError - When partial refund requested but not supported
   * @throws RefundExceedsPaymentError - When refund amount exceeds available
   * @throws PaymentNotRefundableError - When payment cannot be refunded
   */
  createRefund(
    providerPaymentId: string,
    input?: CreateRefundInput
  ): Promise<Refund>

  /**
   * Get refund details
   *
   * @param providerRefundId - Gateway's refund ID
   * @returns Refund details
   * @throws RefundNotFoundError - When refund doesn't exist
   */
  getRefund(providerRefundId: string): Promise<Refund>

  /**
   * List refunds for a payment
   *
   * @param providerPaymentId - Gateway's payment ID
   * @returns List of refunds with pagination info
   */
  listRefunds(providerPaymentId: string): Promise<RefundList>

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verify webhook signature
   *
   * Each gateway uses different signature methods:
   * - Stripe: HMAC with timestamp in header
   * - Razorpay: HMAC SHA256
   * - PayU: Hash comparison
   *
   * This method ONLY verifies signature, does not parse the event.
   *
   * @param request - Raw webhook request
   * @param config - Webhook configuration (signing secret, tolerance)
   * @returns Verification result with isValid flag and optional error
   */
  verifyWebhookSignature(
    request: WebhookRequest,
    config: WebhookConfig
  ): WebhookVerificationResult

  /**
   * Parse webhook into normalized event
   *
   * Translates gateway-specific event format to UniPay's WebhookEvent.
   * This normalizes event types, payload structure, etc.
   *
   * @param request - Raw webhook request (already verified)
   * @returns Normalized webhook event
   * @throws WebhookParsingError - When payload cannot be parsed
   */
  parseWebhookEvent(request: WebhookRequest): WebhookEvent
}

/**
 * Type for adapter constructor options
 *
 * Each adapter has its own config type, but they share common patterns.
 * This is a base type - extend for specific adapters.
 */
export type BaseAdapterConfig = {
  /**
   * Enable sandbox/test mode
   * @default false (production)
   */
  sandbox?: boolean

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number

  /**
   * Number of retry attempts for transient failures
   * @default 3
   */
  maxRetries?: number
}
