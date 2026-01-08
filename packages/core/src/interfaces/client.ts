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
import { PaymentGatewayAdapter } from './adapter'

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER RESOLUTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Provider resolution strategies
 *
 * Determines how the orchestrator selects which gateway to use
 * when multiple are configured.
 */
export type ProviderResolutionStrategy =
  | 'first-available'
  | 'round-robin'
  | 'by-currency'
  | 'by-amount'
  | 'custom'

/**
 * Custom provider resolver function
 *
 * Called by orchestrator when resolutionStrategy is 'custom'.
 * Receives the payment input and list of available providers.
 * Return the provider to use, or undefined to fall back to default.
 *
 * @example
 * const resolver: ProviderResolver = (input, providers) => {
 *   // Route INR to Razorpay, everything else to Stripe
 *   if (input.money.currency === 'INR') {
 *     return PaymentProvider.RAZORPAY
 *   }
 *   return PaymentProvider.STRIPE
 * }
 */
export type ProviderResolver = (
  input: CreatePaymentInput,
  availableProviders: PaymentProvider[]
) => PaymentProvider | undefined

/**
 * Amount-based routing configuration
 *
 * Used when resolutionStrategy is 'by-amount'.
 * Routes payments to different providers based on amount ranges.
 *
 * @example
 * amountRoutes: [
 *   { currency: 'INR', maxAmount: 100000, provider: PaymentProvider.RAZORPAY },
 *   { currency: 'INR', maxAmount: Infinity, provider: PaymentProvider.PAYU },
 *   { currency: 'USD', maxAmount: Infinity, provider: PaymentProvider.STRIPE }
 * ]
 */
export type AmountRoute = {
  /** Currency this route applies to */
  currency: string

  /** Maximum amount for this route (inclusive) */
  maxAmount: number

  /** Provider to use for amounts up to maxAmount */
  provider: PaymentProvider
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options for per-request payment operations
 */
export type PaymentOptions = {
  /**
   * Force use of a specific provider
   *
   * Overrides any resolution strategy.
   * Use when you need explicit control over which gateway is used.
   */
  provider?: PaymentProvider
}

/**
 * Configuration for creating a PaymentClient
 *
 * @example
 * // Simple single-gateway setup
 * const client = createPaymentClient({
 *   adapters: [new StripeAdapter({ apiKey: 'sk_...' })],
 *   webhookConfigs: [
 *     { provider: PaymentProvider.STRIPE, signingSecret: 'whsec_...' }
 *   ]
 * })
 *
 * @example
 * // Multi-gateway with custom routing
 * const client = createPaymentClient({
 *   adapters: [
 *     new StripeAdapter({ apiKey: 'sk_...' }),
 *     new RazorpayAdapter({ keyId: '...', keySecret: '...' }),
 *     new PayUAdapter({ merchantKey: '...', salt: '...' })
 *   ],
 *   resolutionStrategy: 'custom',
 *   customResolver: (input, providers) => {
 *     if (input.money.currency === 'INR') {
 *       return input.money.amount < 100000
 *         ? PaymentProvider.RAZORPAY
 *         : PaymentProvider.PAYU
 *     }
 *     return PaymentProvider.STRIPE
 *   },
 *   webhookConfigs: [
 *     { provider: PaymentProvider.STRIPE, signingSecret: 'whsec_...' },
 *     { provider: PaymentProvider.RAZORPAY, signingSecret: '...' },
 *     { provider: PaymentProvider.PAYU, signingSecret: '...' }
 *   ]
 * })
 */
export type PaymentClientOptions = {
  /**
   * Array of gateway adapters to use
   *
   * Each adapter is an instance implementing PaymentGatewayAdapter.
   * Order matters for 'first-available' and 'round-robin' strategies.
   * Cannot have duplicate providers.
   */
  adapters: PaymentGatewayAdapter[]

  /**
   * Default provider when none specified
   *
   * Used by 'first-available' strategy.
   * If omitted, first adapter is used.
   */
  defaultProvider?: PaymentProvider

  /**
   * Webhook configurations for each provider
   *
   * Required for handleWebhook() and verifyWebhookSignature().
   * Each provider that will receive webhooks needs a config entry.
   */
  webhookConfigs?: WebhookConfig[]

  /**
   * Provider resolution strategy
   *
   * - 'first-available': Use defaultProvider or first adapter (default)
   * - 'round-robin': Rotate between adapters
   * - 'by-currency': Route based on currency support
   * - 'by-amount': Route based on amount ranges (requires amountRoutes)
   * - 'custom': Use customResolver function (requires customResolver)
   *
   * @default 'first-available'
   */
  resolutionStrategy?: ProviderResolutionStrategy

  /**
   * Custom provider resolver function
   *
   * Required when resolutionStrategy is 'custom'.
   * Called for each payment to determine which provider to use.
   */
  customResolver?: ProviderResolver

  /**
   * Amount-based routing configuration
   *
   * Required when resolutionStrategy is 'by-amount'.
   * Defines amount ranges and their target providers.
   */
  amountRoutes?: AmountRoute[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT CLIENT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The unified payment client interface
 *
 * This interface abstracts all payment gateway operations
 * into a single, consistent API. Your application code
 * interacts only with this interface.
 *
 * ## Key Features
 *
 * - **Multi-gateway support**: Configure multiple gateways, route intelligently
 * - **Unified API**: Same methods regardless of underlying gateway
 * - **Type-safe**: Full TypeScript support with discriminated unions
 * - **Flexible routing**: Built-in strategies or custom resolver function
 *
 * ## Example Usage
 *
 * @example
 * // Create a payment
 * const result = await client.createPayment({
 *   money: { amount: 10000, currency: 'INR' },
 *   successUrl: 'https://example.com/success',
 *   cancelUrl: 'https://example.com/cancel',
 *   customer: { email: 'user@example.com' }
 * })
 *
 * if (result.checkoutMode === 'hosted') {
 *   // Redirect to hosted checkout
 *   redirect(result.checkoutUrl)
 * } else {
 *   // Initialize frontend SDK
 *   initializeSDK(result.sdkPayload)
 * }
 *
 * @example
 * // Handle webhook (same for all gateways)
 * app.post('/webhook/:provider', async (req, res) => {
 *   const provider = req.params.provider as PaymentProvider
 *   const event = await client.handleWebhook(provider, {
 *     rawBody: req.body.toString(),
 *     headers: req.headers
 *   })
 *
 *   switch (event.eventType) {
 *     case WebhookEventType.PAYMENT_SUCCEEDED:
 *       await fulfillOrder(event.payload.providerPaymentId)
 *       break
 *     // ... handle other events
 *   }
 *
 *   res.status(200).send('OK')
 * })
 */
export interface PaymentClient {
  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a payment session
   *
   * Routes to appropriate gateway based on:
   * 1. Explicit provider in options (if specified)
   * 2. Resolution strategy (first-available, by-currency, custom, etc.)
   *
   * Returns either:
   * - `HostedCheckoutResult`: Redirect user to `checkoutUrl`
   * - `SdkCheckoutResult`: Use `sdkPayload` with frontend SDK
   *
   * @param input - Payment details (amount, URLs, customer info)
   * @param options - Optional: force specific provider
   * @returns Result with checkout URL or SDK credentials
   *
   * @throws NoProviderAvailableError - No gateway can handle the request
   * @throws ProviderNotFoundError - Explicit provider not registered
   * @throws UnsupportedCurrencyError - No gateway supports the currency
   * @throws PaymentCreationError - Gateway rejected the payment
   * @throws ValidationError - Input validation failed
   */
  createPayment(
    input: CreatePaymentInput,
    options?: PaymentOptions
  ): Promise<CreatePaymentResult>

  /**
   * Get payment details by UniPay ID
   *
   * UniPay ID format: "provider:providerPaymentId"
   * The provider is automatically extracted and routed to.
   *
   * @param unipayId - Format: "provider:providerPaymentId"
   * @returns Full payment details
   *
   * @throws InvalidUnipayIdError - Invalid ID format
   * @throws ProviderNotFoundError - Provider not registered
   * @throws PaymentNotFoundError - Payment doesn't exist
   */
  getPayment(unipayId: string): Promise<Payment>

  /**
   * Get payment by provider-specific ID
   *
   * Use when you have the raw provider ID, not UniPay ID.
   *
   * @param provider - Which gateway to query
   * @param providerPaymentId - Gateway's payment ID
   * @returns Full payment details
   *
   * @throws ProviderNotFoundError - Provider not registered
   * @throws PaymentNotFoundError - Payment doesn't exist
   */
  getPaymentByProviderId(
    provider: PaymentProvider,
    providerPaymentId: string
  ): Promise<Payment>

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a refund
   *
   * Automatically routes to the gateway that processed
   * the original payment (parsed from unipayId).
   *
   * @param unipayId - UniPay ID of payment to refund
   * @param input - Refund details (optional amount for partial refund)
   * @returns Refund details
   *
   * @throws InvalidUnipayIdError - Invalid ID format
   * @throws ProviderNotFoundError - Provider not registered
   * @throws RefundCreationError - Refund failed
   * @throws PartialRefundNotSupportedError - Partial refund not supported
   * @throws RefundExceedsPaymentError - Amount exceeds available
   */
  createRefund(unipayId: string, input?: CreateRefundInput): Promise<Refund>

  /**
   * Get refund details
   *
   * @param provider - Which gateway to query
   * @param providerRefundId - Gateway's refund ID
   * @returns Refund details
   *
   * @throws ProviderNotFoundError - Provider not registered
   * @throws RefundNotFoundError - Refund doesn't exist
   */
  getRefund(provider: PaymentProvider, providerRefundId: string): Promise<Refund>

  /**
   * List refunds for a payment
   *
   * @param unipayId - UniPay ID of the payment
   * @returns List of refunds with pagination info
   *
   * @throws InvalidUnipayIdError - Invalid ID format
   * @throws ProviderNotFoundError - Provider not registered
   */
  listRefunds(unipayId: string): Promise<RefundList>

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle incoming webhook
   *
   * Verifies signature and parses into normalized event.
   * You specify which provider sent the webhook (usually from URL path).
   *
   * @param provider - Which gateway sent this webhook
   * @param request - Raw webhook request (body + headers)
   * @returns Normalized webhook event
   *
   * @throws WebhookProviderNotConfiguredError - No config for provider
   * @throws WebhookSignatureError - Invalid signature
   * @throws WebhookParsingError - Cannot parse payload
   *
   * @example
   * // Express.js
   * app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
   *   try {
   *     const event = await client.handleWebhook(PaymentProvider.STRIPE, {
   *       rawBody: req.body.toString(),
   *       headers: req.headers
   *     })
   *     // Handle event...
   *     res.status(200).send('OK')
   *   } catch (error) {
   *     if (error instanceof WebhookSignatureError) {
   *       return res.status(401).send('Invalid signature')
   *     }
   *     throw error
   *   }
   * })
   */
  handleWebhook(
    provider: PaymentProvider,
    request: WebhookRequest
  ): Promise<WebhookEvent>

  /**
   * Verify webhook signature only
   *
   * Use when you want to verify without parsing.
   * Returns result instead of throwing.
   *
   * @param provider - Which gateway sent this webhook
   * @param request - Raw webhook request
   * @returns Verification result with isValid flag
   *
   * @throws WebhookProviderNotConfiguredError - No config for provider
   */
  verifyWebhookSignature(
    provider: PaymentProvider,
    request: WebhookRequest
  ): WebhookVerificationResult

  // ═══════════════════════════════════════════════════════════════════════════
  // INTROSPECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get capabilities for a provider
   *
   * Useful for checking what features a provider supports
   * before attempting operations.
   *
   * @param provider - Provider to check
   * @returns Capabilities or undefined if not registered
   *
   * @example
   * const caps = client.getProviderCapabilities(PaymentProvider.RAZORPAY)
   * if (caps && hasCapability(caps, AdapterCapability.PARTIAL_REFUND)) {
   *   // Safe to do partial refund
   * }
   */
  getProviderCapabilities(provider: PaymentProvider): AdapterCapabilities | undefined

  /**
   * List all registered providers
   *
   * @returns Array of provider identifiers
   */
  getRegisteredProviders(): PaymentProvider[]

  /**
   * Check if a provider is available
   *
   * @param provider - Provider to check
   * @returns true if registered and available
   */
  isProviderAvailable(provider: PaymentProvider): boolean
}

/**
 * Factory function type for creating PaymentClient
 *
 * @example
 * import { createPaymentClient } from '@uniipay/orchestrator'
 *
 * const client = createPaymentClient({
 *   adapters: [stripeAdapter, razorpayAdapter],
 *   resolutionStrategy: 'by-currency'
 * })
 */
export type CreatePaymentClient = (options: PaymentClientOptions) => PaymentClient
