import {
  // Enums
  PaymentProvider,
  AdapterCapability,
  CheckoutMode,
  // Types
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
  AdapterCapabilities,
  // Interfaces
  PaymentGatewayAdapter,
  PaymentClient,
  PaymentClientOptions,
  PaymentOptions,
  ProviderResolutionStrategy,
  ProviderResolver,
  AmountRoute,
  // Errors
  MissingProviderError,
  DuplicateProviderError,
  InvalidResolutionStrategyError,
  MissingWebhookConfigError,
  NoProviderAvailableError,
  ProviderNotFoundError,
  UnsupportedCurrencyError,
  UnsupportedCheckoutModeError,
  WebhookSignatureError,
  // Utils
  parseUnipayId,
  hasCapability,
  supportsCurrency
} from '@unipay/core'

import {
  resolveFirstAvailable,
  resolveRoundRobin,
  createRoundRobinState,
  resolveByCurrency,
  resolveByAmount
} from './resolvers'

import type { RoundRobinState } from './resolvers'

/**
 * PaymentOrchestrator - Multi-gateway payment client implementation
 *
 * Implements the PaymentClient interface, providing:
 * - Multi-gateway support with intelligent routing
 * - Unified API for all payment operations
 * - Automatic webhook normalization
 * - Type-safe error handling
 *
 * @example
 * const client = new PaymentOrchestrator({
 *   adapters: [stripeAdapter, razorpayAdapter],
 *   resolutionStrategy: 'by-currency',
 *   webhookConfigs: [
 *     { provider: PaymentProvider.STRIPE, signingSecret: 'whsec_...' },
 *     { provider: PaymentProvider.RAZORPAY, signingSecret: '...' }
 *   ]
 * })
 *
 * // Or use the factory function
 * const client = createPaymentClient({ ... })
 */
export class PaymentOrchestrator implements PaymentClient {
  private readonly adapters: Map<PaymentProvider, PaymentGatewayAdapter>
  private readonly webhookConfigs: Map<PaymentProvider, WebhookConfig>
  private readonly defaultProvider?: PaymentProvider
  private readonly resolutionStrategy: ProviderResolutionStrategy
  private readonly customResolver?: ProviderResolver
  private readonly amountRoutes: AmountRoute[]

  // State for stateful resolution strategies
  private roundRobinState: RoundRobinState

  constructor(options: PaymentClientOptions) {
    // Validate at least one adapter
    if (!options.adapters || options.adapters.length === 0) {
      throw new MissingProviderError()
    }

    // Build adapter map, checking for duplicates
    this.adapters = new Map()
    for (const adapter of options.adapters) {
      if (this.adapters.has(adapter.provider)) {
        throw new DuplicateProviderError(adapter.provider)
      }
      this.adapters.set(adapter.provider, adapter)
    }

    // Build webhook config map
    this.webhookConfigs = new Map()
    if (options.webhookConfigs) {
      for (const config of options.webhookConfigs) {
        this.webhookConfigs.set(config.provider, config)
      }
    }

    // Set defaults
    this.defaultProvider = options.defaultProvider
    this.resolutionStrategy = options.resolutionStrategy || 'first-available'
    this.customResolver = options.customResolver
    this.amountRoutes = options.amountRoutes || []

    // Initialize resolution state
    this.roundRobinState = createRoundRobinState()

    // Validate resolution strategy configuration
    this.validateResolutionStrategy()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async createPayment(
    input: CreatePaymentInput,
    options?: PaymentOptions
  ): Promise<CreatePaymentResult> {
    // Resolve which provider to use
    const provider = this.resolveProvider(input, options?.provider)

    // Get adapter
    const adapter = this.getAdapter(provider)

    // Validate currency support
    if (!supportsCurrency(adapter.capabilities, input.money.currency)) {
      throw new UnsupportedCurrencyError(provider, input.money.currency)
    }

    // Validate checkout mode if specified
    if (input.preferredCheckoutMode) {
      this.validateCheckoutMode(adapter, input.preferredCheckoutMode)
    }

    // Create payment
    return adapter.createPayment(input)
  }

  async getPayment(unipayId: string): Promise<Payment> {
    const { provider, providerPaymentId } = parseUnipayId(unipayId)
    const adapter = this.getAdapter(provider)
    return adapter.getPayment(providerPaymentId)
  }

  async getPaymentByProviderId(
    provider: PaymentProvider,
    providerPaymentId: string
  ): Promise<Payment> {
    const adapter = this.getAdapter(provider)
    return adapter.getPayment(providerPaymentId)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async createRefund(
    unipayId: string,
    input?: CreateRefundInput
  ): Promise<Refund> {
    const { provider, providerPaymentId } = parseUnipayId(unipayId)
    const adapter = this.getAdapter(provider)
    return adapter.createRefund(providerPaymentId, input)
  }

  async getRefund(
    provider: PaymentProvider,
    providerRefundId: string
  ): Promise<Refund> {
    const adapter = this.getAdapter(provider)
    return adapter.getRefund(providerRefundId)
  }

  async listRefunds(unipayId: string): Promise<RefundList> {
    const { provider, providerPaymentId } = parseUnipayId(unipayId)
    const adapter = this.getAdapter(provider)
    return adapter.listRefunds(providerPaymentId)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async handleWebhook(
    provider: PaymentProvider,
    request: WebhookRequest
  ): Promise<WebhookEvent> {
    const adapter = this.getAdapter(provider)
    const config = this.getWebhookConfig(provider)

    // Verify signature
    const verification = adapter.verifyWebhookSignature(request, config)
    if (!verification.isValid) {
      throw new WebhookSignatureError(provider, verification.error)
    }

    // Parse and return normalized event
    return adapter.parseWebhookEvent(request)
  }

  verifyWebhookSignature(
    provider: PaymentProvider,
    request: WebhookRequest
  ): WebhookVerificationResult {
    const adapter = this.getAdapter(provider)
    const config = this.getWebhookConfig(provider)
    return adapter.verifyWebhookSignature(request, config)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTROSPECTION
  // ═══════════════════════════════════════════════════════════════════════════

  getProviderCapabilities(
    provider: PaymentProvider
  ): AdapterCapabilities | undefined {
    const adapter = this.adapters.get(provider)
    return adapter?.capabilities
  }

  getRegisteredProviders(): PaymentProvider[] {
    return Array.from(this.adapters.keys())
  }

  isProviderAvailable(provider: PaymentProvider): boolean {
    return this.adapters.has(provider)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Resolve which provider to use for a payment
   */
  private resolveProvider(
    input: CreatePaymentInput,
    explicitProvider?: PaymentProvider
  ): PaymentProvider {
    // Explicit provider takes precedence
    if (explicitProvider) {
      if (!this.adapters.has(explicitProvider)) {
        throw new ProviderNotFoundError(explicitProvider)
      }
      return explicitProvider
    }

    // Apply resolution strategy
    let resolved: PaymentProvider | undefined

    switch (this.resolutionStrategy) {
      case 'first-available':
        resolved = resolveFirstAvailable(
          input,
          this.adapters,
          this.defaultProvider
        )
        break

      case 'round-robin':
        resolved = resolveRoundRobin(
          input,
          this.adapters,
          this.roundRobinState
        )
        break

      case 'by-currency':
        resolved = resolveByCurrency(
          input,
          this.adapters,
          this.defaultProvider
        )
        break

      case 'by-amount':
        resolved = resolveByAmount(
          input,
          this.adapters,
          this.amountRoutes,
          this.defaultProvider
        )
        break

      case 'custom':
        if (this.customResolver) {
          resolved = this.customResolver(
            input,
            Array.from(this.adapters.keys())
          )
        }
        break

      default:
        throw new InvalidResolutionStrategyError(this.resolutionStrategy)
    }

    if (!resolved) {
      throw new NoProviderAvailableError(
        `No provider available for currency '${input.money.currency}'`
      )
    }

    // Verify resolved provider is registered
    if (!this.adapters.has(resolved)) {
      throw new ProviderNotFoundError(resolved)
    }

    return resolved
  }

  /**
   * Get adapter, throwing if not found
   */
  private getAdapter(provider: PaymentProvider): PaymentGatewayAdapter {
    const adapter = this.adapters.get(provider)
    if (!adapter) {
      throw new ProviderNotFoundError(provider)
    }
    return adapter
  }

  /**
   * Get webhook config, throwing if not found
   */
  private getWebhookConfig(provider: PaymentProvider): WebhookConfig {
    const config = this.webhookConfigs.get(provider)
    if (!config) {
      throw new MissingWebhookConfigError(provider)
    }
    return config
  }

  /**
   * Validate checkout mode support
   */
  private validateCheckoutMode(
    adapter: PaymentGatewayAdapter,
    mode: CheckoutMode
  ): void {
    const capability =
      mode === CheckoutMode.HOSTED
        ? AdapterCapability.HOSTED_CHECKOUT
        : AdapterCapability.SDK_CHECKOUT

    if (!hasCapability(adapter.capabilities, capability)) {
      throw new UnsupportedCheckoutModeError(adapter.provider, mode)
    }
  }

  /**
   * Validate resolution strategy configuration at construction time
   */
  private validateResolutionStrategy(): void {
    switch (this.resolutionStrategy) {
      case 'custom':
        if (!this.customResolver) {
          throw new InvalidResolutionStrategyError(
            "Strategy 'custom' requires customResolver function"
          )
        }
        break

      case 'by-amount':
        if (!this.amountRoutes || this.amountRoutes.length === 0) {
          throw new InvalidResolutionStrategyError(
            "Strategy 'by-amount' requires amountRoutes configuration"
          )
        }
        break

      case 'first-available':
      case 'round-robin':
      case 'by-currency':
        // These don't require additional configuration
        break

      default:
        // Allow valid strategies
        break
    }
  }
}

/**
 * Factory function to create a PaymentClient
 *
 * @example
 * const client = createPaymentClient({
 *   adapters: [
 *     new StripeAdapter({ apiKey: 'sk_...' }),
 *     new RazorpayAdapter({ keyId: '...', keySecret: '...' })
 *   ],
 *   resolutionStrategy: 'by-currency',
 *   webhookConfigs: [
 *     { provider: PaymentProvider.STRIPE, signingSecret: 'whsec_...' },
 *     { provider: PaymentProvider.RAZORPAY, signingSecret: '...' }
 *   ]
 * })
 */
export function createPaymentClient(options: PaymentClientOptions): PaymentClient {
  return new PaymentOrchestrator(options)
}
