import { Money } from './money'
import { CustomerInfo } from './customer'
import { PaymentProvider, PaymentStatus, CheckoutMode } from '../enums'

/**
 * Input for creating a new payment session
 *
 * Creates either:
 * - Hosted checkout: User is redirected to gateway's secure payment page
 * - SDK checkout: Frontend uses gateway's SDK with returned credentials
 *
 * @example
 * // Hosted checkout (redirect-based)
 * {
 *   money: { amount: 10000, currency: 'INR' },
 *   successUrl: 'https://mysite.com/success',
 *   cancelUrl: 'https://mysite.com/cancel',
 *   customer: { email: 'user@example.com' },
 *   metadata: { orderId: 'order-123' }
 * }
 *
 * @example
 * // SDK checkout (frontend SDK integration)
 * {
 *   money: { amount: 10000, currency: 'INR' },
 *   successUrl: 'https://mysite.com/success',
 *   cancelUrl: 'https://mysite.com/cancel',
 *   preferredCheckoutMode: 'sdk'
 * }
 */
export type CreatePaymentInput = {
  /** Amount and currency */
  readonly money: Money

  /** URL to redirect after successful payment */
  readonly successUrl: string

  /** URL to redirect after failed/cancelled payment */
  readonly cancelUrl: string

  /** Customer information */
  readonly customer?: CustomerInfo

  /** Your internal order/transaction reference */
  readonly orderId?: string

  /** Description shown to customer on checkout page */
  readonly description?: string

  /** Custom key-value metadata (stored with payment, returned in webhooks) */
  readonly metadata?: Readonly<Record<string, string>>

  /** Idempotency key to prevent duplicate payments */
  readonly idempotencyKey?: string

  /** Session/link expiry in seconds (gateway-specific support) */
  readonly expiresInSeconds?: number

  /**
   * Preferred checkout mode
   * - 'hosted': Redirect user to gateway's hosted checkout page
   * - 'sdk': Use gateway's frontend SDK (returns credentials for frontend)
   *
   * If not specified, adapter chooses based on its capabilities.
   * Not all adapters support both modes.
   */
  readonly preferredCheckoutMode?: CheckoutMode
}

/**
 * Result of payment creation - Hosted checkout mode
 *
 * User should be redirected to checkoutUrl
 */
export type HostedCheckoutResult = {
  readonly checkoutMode: 'hosted'

  /** Which provider handled this payment */
  readonly provider: PaymentProvider

  /** Provider's unique payment identifier */
  readonly providerPaymentId: string

  /**
   * UniPay's correlation ID
   * Format: provider:providerPaymentId (e.g., 'stripe:cs_test_abc123')
   */
  readonly unipayId: string

  /** Current payment status */
  readonly status: PaymentStatus

  /**
   * URL to redirect user for payment
   * This is the gateway's hosted checkout page
   */
  readonly checkoutUrl: string

  /** When this session/link expires (if applicable) */
  readonly expiresAt?: Date

  /** Your metadata echoed back */
  readonly metadata?: Readonly<Record<string, string>>

  /**
   * Raw provider response - escape hatch for advanced use
   * Type varies by provider, use with caution
   */
  readonly raw: unknown
}

/**
 * Result of payment creation - SDK checkout mode
 *
 * Frontend uses these credentials with gateway's SDK
 *
 * @example
 * // Razorpay SDK integration
 * const options = {
 *   key: 'rzp_test_xxx', // From your config
 *   order_id: result.sdkPayload.orderId,
 *   amount: result.sdkPayload.amount,
 *   currency: result.sdkPayload.currency
 * }
 * const rzp = new Razorpay(options)
 * rzp.open()
 *
 * @example
 * // Stripe Elements integration
 * const stripe = Stripe('pk_test_xxx')
 * stripe.confirmPayment({
 *   clientSecret: result.sdkPayload.clientSecret
 * })
 */
export type SdkCheckoutResult = {
  readonly checkoutMode: 'sdk'

  /** Which provider handled this payment */
  readonly provider: PaymentProvider

  /** Provider's unique payment identifier */
  readonly providerPaymentId: string

  /**
   * UniPay's correlation ID
   * Format: provider:providerPaymentId (e.g., 'stripe:pi_abc123')
   */
  readonly unipayId: string

  /** Current payment status */
  readonly status: PaymentStatus

  /**
   * Credentials and data for frontend SDK integration
   *
   * Structure varies by provider:
   * - Stripe: { clientSecret: string, publicKey?: string }
   * - Razorpay: { orderId: string, amount: number, currency: string, keyId?: string }
   * - PayU: { txnId: string, hash: string, merchantKey: string, ... }
   *
   * Use with the provider's frontend SDK
   */
  readonly sdkPayload: SdkPayload

  /** When this session expires (if applicable) */
  readonly expiresAt?: Date

  /** Your metadata echoed back */
  readonly metadata?: Readonly<Record<string, string>>

  /**
   * Raw provider response - escape hatch for advanced use
   * Type varies by provider, use with caution
   */
  readonly raw: unknown
}

/**
 * SDK payload varies by provider
 * Common fields are typed, provider-specific fields in `providerData`
 */
export type SdkPayload = {
  /**
   * Stripe: clientSecret for PaymentIntent/SetupIntent
   * Used with stripe.confirmPayment() or stripe.confirmSetup()
   */
  readonly clientSecret?: string

  /**
   * Razorpay: order_id for Razorpay checkout
   * Used with new Razorpay({ order_id: ... })
   */
  readonly orderId?: string

  /**
   * Amount in smallest currency unit (for SDKs that need it)
   */
  readonly amount?: number

  /**
   * Currency code (for SDKs that need it)
   */
  readonly currency?: string

  /**
   * Provider-specific additional data
   * Cast to provider-specific type if needed
   *
   * @example
   * // PayU specific
   * const payuData = result.sdkPayload.providerData as PayUSdkData
   * // { txnId, hash, merchantKey, productInfo, ... }
   */
  readonly providerData?: Readonly<Record<string, unknown>>
}

/**
 * Result of payment creation - discriminated union
 *
 * Use checkoutMode to determine which type:
 * - 'hosted': Redirect user to checkoutUrl
 * - 'sdk': Use sdkPayload with gateway's frontend SDK
 *
 * @example
 * const result = await client.createPayment(input)
 *
 * if (result.checkoutMode === 'hosted') {
 *   // Redirect to hosted checkout
 *   window.location.href = result.checkoutUrl
 * } else {
 *   // Use frontend SDK
 *   initializeGatewaySDK(result.sdkPayload)
 * }
 */
export type CreatePaymentResult = HostedCheckoutResult | SdkCheckoutResult

/**
 * Full payment details retrieved from gateway
 */
export type Payment = {
  /** Provider that processed this payment */
  readonly provider: PaymentProvider

  /** Provider's payment ID */
  readonly providerPaymentId: string

  /** UniPay correlation ID */
  readonly unipayId: string

  /** Current status */
  readonly status: PaymentStatus

  /** Amount charged */
  readonly money: Money

  /** Amount refunded (if any) */
  readonly amountRefunded?: number

  /** When payment was created */
  readonly createdAt: Date

  /** When payment was last updated */
  readonly updatedAt: Date

  /** When payment was captured (if succeeded) */
  readonly capturedAt?: Date

  /** Customer info used */
  readonly customer?: CustomerInfo

  /** Your metadata */
  readonly metadata?: Readonly<Record<string, string>>

  /** Provider's failure reason (if failed) */
  readonly failureReason?: string

  /** Provider's failure code */
  readonly failureCode?: string

  /** Raw provider response */
  readonly raw: unknown
}
