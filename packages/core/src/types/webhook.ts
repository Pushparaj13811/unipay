import { Money } from './money'
import { PaymentProvider, PaymentStatus, RefundStatus, WebhookEventType } from '../enums'

/**
 * Raw webhook request from your HTTP handler
 *
 * @example
 * // Express.js
 * app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
 *   const request: WebhookRequest = {
 *     rawBody: req.body.toString(),
 *     headers: req.headers
 *   }
 * })
 */
export type WebhookRequest = {
  /** Raw request body as string (before JSON parsing) */
  readonly rawBody: string

  /** Request headers (for signature verification) */
  readonly headers: Readonly<Record<string, string | string[] | undefined>>
}

/**
 * Result of webhook signature verification
 */
export type WebhookVerificationResult = {
  /** Whether signature is valid */
  readonly isValid: boolean
  /** Error message if invalid */
  readonly error?: string
}

/**
 * Normalized webhook event - gateway-agnostic
 *
 * All gateway-specific events are normalized to this structure,
 * allowing you to write one webhook handler for all gateways.
 */
export type WebhookEvent = {
  /** Which provider sent this webhook */
  readonly provider: PaymentProvider

  /** Normalized event type */
  readonly eventType: WebhookEventType

  /** Provider's event ID (for deduplication) */
  readonly providerEventId: string

  /** Provider's original event type string */
  readonly providerEventType: string

  /** When this event occurred */
  readonly timestamp: Date

  /** Event payload - type depends on eventType */
  readonly payload: WebhookPayload

  /** Raw provider event (escape hatch) */
  readonly raw: unknown
}

/**
 * Discriminated union for webhook payloads
 * Use payload.type to determine which type it is
 */
export type WebhookPayload =
  | PaymentWebhookPayload
  | RefundWebhookPayload
  | UnknownWebhookPayload

/**
 * Payment-related webhook payload
 */
export type PaymentWebhookPayload = {
  readonly type: 'payment'
  readonly providerPaymentId: string
  readonly status: PaymentStatus
  readonly money: Money
  readonly metadata?: Readonly<Record<string, string>>
  readonly failureReason?: string
  readonly failureCode?: string
}

/**
 * Refund-related webhook payload
 */
export type RefundWebhookPayload = {
  readonly type: 'refund'
  readonly providerRefundId: string
  readonly providerPaymentId: string
  readonly status: RefundStatus
  readonly money: Money
  readonly failureReason?: string
}

/**
 * Unknown/unmapped webhook payload
 */
export type UnknownWebhookPayload = {
  readonly type: 'unknown'
  readonly data: unknown
}

/**
 * Configuration for webhook handling per provider
 *
 * @example
 * {
 *   provider: PaymentProvider.STRIPE,
 *   signingSecret: 'whsec_...'
 * }
 */
export type WebhookConfig = {
  /** Provider identifier */
  readonly provider: PaymentProvider

  /**
   * Webhook signing secret
   * - Stripe: webhook endpoint secret (whsec_...)
   * - Razorpay: webhook secret from dashboard
   * - PayU: merchant salt
   */
  readonly signingSecret: string

  /** Optional tolerance for timestamp validation (seconds) */
  readonly timestampToleranceSeconds?: number
}
