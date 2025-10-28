import { PaymentProvider } from '../enums'
import { UniPayError } from './base'

/**
 * Error codes for webhook-related errors
 */
export const WebhookErrorCode = {
  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_PARSING_FAILED: 'WEBHOOK_PARSING_FAILED',
  WEBHOOK_PROVIDER_NOT_CONFIGURED: 'WEBHOOK_PROVIDER_NOT_CONFIGURED',
  WEBHOOK_TIMESTAMP_EXPIRED: 'WEBHOOK_TIMESTAMP_EXPIRED'
} as const

export type WebhookErrorCode = (typeof WebhookErrorCode)[keyof typeof WebhookErrorCode]

/**
 * Base class for webhook-related errors
 */
export class WebhookError extends UniPayError {
  readonly code: WebhookErrorCode

  constructor(
    code: WebhookErrorCode,
    message: string,
    options?: { provider?: PaymentProvider; cause?: Error }
  ) {
    super(message, options)
    this.code = code
  }
}

/**
 * Thrown when webhook signature verification fails
 *
 * This is a security-critical error - do not process
 * webhooks that fail signature verification.
 *
 * @example
 * try {
 *   const event = await client.handleWebhook(provider, request)
 * } catch (error) {
 *   if (error instanceof WebhookSignatureError) {
 *     // Log security event
 *     console.error('Invalid webhook signature:', error.message)
 *     return res.status(401).json({ error: 'Invalid signature' })
 *   }
 * }
 */
export class WebhookSignatureError extends WebhookError {
  constructor(provider: PaymentProvider, reason?: string) {
    super(
      WebhookErrorCode.WEBHOOK_SIGNATURE_INVALID,
      reason
        ? `Invalid webhook signature from ${provider}: ${reason}`
        : `Invalid webhook signature from ${provider}`,
      { provider }
    )
  }
}

/**
 * Thrown when webhook payload cannot be parsed
 *
 * @example
 * // Malformed JSON or unexpected structure
 * await client.handleWebhook(provider, { rawBody: 'invalid', headers: {} })
 * // throws WebhookParsingError
 */
export class WebhookParsingError extends WebhookError {
  constructor(provider: PaymentProvider, reason: string, cause?: Error) {
    super(
      WebhookErrorCode.WEBHOOK_PARSING_FAILED,
      `Failed to parse webhook from ${provider}: ${reason}`,
      { provider, cause }
    )
  }
}

/**
 * Thrown when webhook handler is not configured for provider
 *
 * @example
 * const client = createPaymentClient({
 *   adapters: [stripeAdapter],
 *   webhookConfigs: []  // No webhook config for stripe
 * })
 * await client.handleWebhook(PaymentProvider.STRIPE, request)
 * // throws WebhookProviderNotConfiguredError
 */
export class WebhookProviderNotConfiguredError extends WebhookError {
  constructor(provider: PaymentProvider) {
    super(
      WebhookErrorCode.WEBHOOK_PROVIDER_NOT_CONFIGURED,
      `Webhook handler not configured for provider '${provider}'`,
      { provider }
    )
  }
}

/**
 * Thrown when webhook timestamp is too old
 *
 * Some gateways include a timestamp in webhooks to prevent
 * replay attacks. This error is thrown when the timestamp
 * exceeds the configured tolerance.
 */
export class WebhookTimestampExpiredError extends WebhookError {
  readonly timestamp: Date
  readonly tolerance: number

  constructor(
    provider: PaymentProvider,
    timestamp: Date,
    toleranceSeconds: number
  ) {
    super(
      WebhookErrorCode.WEBHOOK_TIMESTAMP_EXPIRED,
      `Webhook timestamp from ${provider} is too old (${timestamp.toISOString()}). Tolerance: ${toleranceSeconds}s`,
      { provider }
    )
    this.timestamp = timestamp
    this.tolerance = toleranceSeconds
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      timestamp: this.timestamp.toISOString(),
      toleranceSeconds: this.tolerance
    }
  }
}
