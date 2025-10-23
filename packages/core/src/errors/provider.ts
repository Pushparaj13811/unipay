import { PaymentProvider, AdapterCapability, CheckoutMode } from '../enums'
import { UniPayError } from './base'

/**
 * Error codes for provider resolution errors
 */
export const ProviderErrorCode = {
  NO_PROVIDER_AVAILABLE: 'NO_PROVIDER_AVAILABLE',
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  UNSUPPORTED_CAPABILITY: 'UNSUPPORTED_CAPABILITY',
  UNSUPPORTED_CURRENCY: 'UNSUPPORTED_CURRENCY',
  UNSUPPORTED_CHECKOUT_MODE: 'UNSUPPORTED_CHECKOUT_MODE'
} as const

export type ProviderErrorCode = (typeof ProviderErrorCode)[keyof typeof ProviderErrorCode]

/**
 * Base class for provider resolution errors
 *
 * Thrown when the orchestrator cannot find a suitable provider
 * for the requested operation.
 */
export class ProviderResolutionError extends UniPayError {
  readonly code: ProviderErrorCode

  constructor(
    code: ProviderErrorCode,
    message: string,
    options?: { provider?: PaymentProvider; cause?: Error }
  ) {
    super(message, options)
    this.code = code
  }
}

/**
 * Thrown when no provider can handle the request
 *
 * This can happen when:
 * - No adapters are registered
 * - No adapter supports the requested currency
 * - Custom resolver returns undefined
 *
 * @example
 * // No adapters registered
 * const client = createPaymentClient({ adapters: [] })
 * await client.createPayment(input) // throws NoProviderAvailableError
 */
export class NoProviderAvailableError extends ProviderResolutionError {
  constructor(reason?: string) {
    super(
      ProviderErrorCode.NO_PROVIDER_AVAILABLE,
      reason || 'No payment provider available for this request'
    )
  }
}

/**
 * Thrown when explicitly requested provider is not registered
 *
 * @example
 * const client = createPaymentClient({
 *   adapters: [new StripeAdapter({ ... })]
 * })
 * await client.createPayment(input, { provider: PaymentProvider.RAZORPAY })
 * // throws ProviderNotFoundError
 */
export class ProviderNotFoundError extends ProviderResolutionError {
  constructor(provider: PaymentProvider) {
    super(
      ProviderErrorCode.PROVIDER_NOT_FOUND,
      `Provider '${provider}' is not registered`,
      { provider }
    )
  }
}

/**
 * Thrown when provider doesn't support a required capability
 *
 * @example
 * // Provider doesn't support partial refunds
 * await client.createRefund(unipayId, { amount: 500 })
 * // throws UnsupportedCapabilityError if adapter doesn't support PARTIAL_REFUND
 */
export class UnsupportedCapabilityError extends ProviderResolutionError {
  readonly capability: AdapterCapability

  constructor(provider: PaymentProvider, capability: AdapterCapability) {
    super(
      ProviderErrorCode.UNSUPPORTED_CAPABILITY,
      `Provider '${provider}' does not support '${capability}'`,
      { provider }
    )
    this.capability = capability
  }
}

/**
 * Thrown when provider doesn't support the requested currency
 *
 * @example
 * // Razorpay adapter only configured for INR
 * await client.createPayment({
 *   money: { amount: 1000, currency: 'USD' },
 *   ...
 * }, { provider: PaymentProvider.RAZORPAY })
 * // throws UnsupportedCurrencyError
 */
export class UnsupportedCurrencyError extends ProviderResolutionError {
  readonly currency: string

  constructor(provider: PaymentProvider, currency: string) {
    super(
      ProviderErrorCode.UNSUPPORTED_CURRENCY,
      `Provider '${provider}' does not support currency '${currency}'`,
      { provider }
    )
    this.currency = currency
  }
}

/**
 * Thrown when provider doesn't support the requested checkout mode
 *
 * @example
 * // PayU adapter only supports hosted checkout
 * await client.createPayment({
 *   ...
 *   preferredCheckoutMode: CheckoutMode.SDK
 * }, { provider: PaymentProvider.PAYU })
 * // throws UnsupportedCheckoutModeError
 */
export class UnsupportedCheckoutModeError extends ProviderResolutionError {
  readonly checkoutMode: CheckoutMode

  constructor(provider: PaymentProvider, checkoutMode: CheckoutMode) {
    super(
      ProviderErrorCode.UNSUPPORTED_CHECKOUT_MODE,
      `Provider '${provider}' does not support checkout mode '${checkoutMode}'`,
      { provider }
    )
    this.checkoutMode = checkoutMode
  }
}
