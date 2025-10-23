import { PaymentProvider } from '../enums'
import { UniPayError } from './base'

/**
 * Error codes for configuration errors
 */
export const ConfigurationErrorCode = {
  INVALID_PROVIDER_CONFIG: 'INVALID_PROVIDER_CONFIG',
  MISSING_PROVIDER: 'MISSING_PROVIDER',
  DUPLICATE_PROVIDER: 'DUPLICATE_PROVIDER',
  INVALID_RESOLUTION_STRATEGY: 'INVALID_RESOLUTION_STRATEGY',
  MISSING_WEBHOOK_CONFIG: 'MISSING_WEBHOOK_CONFIG'
} as const

export type ConfigurationErrorCode =
  (typeof ConfigurationErrorCode)[keyof typeof ConfigurationErrorCode]

/**
 * Base class for configuration-related errors
 *
 * Thrown during client initialization when configuration is invalid.
 */
export class ConfigurationError extends UniPayError {
  readonly code: ConfigurationErrorCode

  constructor(
    code: ConfigurationErrorCode,
    message: string,
    options?: { provider?: PaymentProvider; cause?: Error }
  ) {
    super(message, options)
    this.code = code
  }
}

/**
 * Thrown when adapter configuration is invalid
 *
 * @example
 * // Missing required API key
 * new StripeAdapter({}) // throws InvalidProviderConfigError
 */
export class InvalidProviderConfigError extends ConfigurationError {
  constructor(provider: PaymentProvider, reason: string, cause?: Error) {
    super(
      ConfigurationErrorCode.INVALID_PROVIDER_CONFIG,
      `Invalid configuration for ${provider}: ${reason}`,
      { provider, cause }
    )
  }
}

/**
 * Thrown when no adapters are provided to the orchestrator
 *
 * @example
 * createPaymentClient({ adapters: [] }) // throws MissingProviderError
 */
export class MissingProviderError extends ConfigurationError {
  constructor() {
    super(
      ConfigurationErrorCode.MISSING_PROVIDER,
      'At least one adapter must be provided'
    )
  }
}

/**
 * Thrown when duplicate adapters for the same provider are registered
 *
 * @example
 * createPaymentClient({
 *   adapters: [
 *     new StripeAdapter({ apiKey: 'key1' }),
 *     new StripeAdapter({ apiKey: 'key2' })  // throws DuplicateProviderError
 *   ]
 * })
 */
export class DuplicateProviderError extends ConfigurationError {
  constructor(provider: PaymentProvider) {
    super(
      ConfigurationErrorCode.DUPLICATE_PROVIDER,
      `Duplicate adapter for provider '${provider}'. Each provider can only have one adapter.`,
      { provider }
    )
  }
}

/**
 * Thrown when resolution strategy is invalid
 */
export class InvalidResolutionStrategyError extends ConfigurationError {
  constructor(strategy: string) {
    super(
      ConfigurationErrorCode.INVALID_RESOLUTION_STRATEGY,
      `Invalid resolution strategy '${strategy}'. Must be one of: first-available, round-robin, by-currency, by-amount, custom`
    )
  }
}

/**
 * Thrown when webhook config is missing for a provider
 */
export class MissingWebhookConfigError extends ConfigurationError {
  constructor(provider: PaymentProvider) {
    super(
      ConfigurationErrorCode.MISSING_WEBHOOK_CONFIG,
      `Webhook configuration not found for provider '${provider}'`,
      { provider }
    )
  }
}
