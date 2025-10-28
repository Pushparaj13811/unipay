import { PaymentProvider } from '../enums'
import { UniPayError } from './base'

/**
 * Error codes for payment-related errors
 */
export const PaymentErrorCode = {
  PAYMENT_CREATION_FAILED: 'PAYMENT_CREATION_FAILED',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_RETRIEVAL_FAILED: 'PAYMENT_RETRIEVAL_FAILED',
  PAYMENT_ALREADY_CAPTURED: 'PAYMENT_ALREADY_CAPTURED',
  PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
  PAYMENT_CANCELLED: 'PAYMENT_CANCELLED'
} as const

export type PaymentErrorCode = (typeof PaymentErrorCode)[keyof typeof PaymentErrorCode]

/**
 * Base class for payment-related errors
 *
 * Thrown during payment operations (create, retrieve, etc.)
 */
export class PaymentError extends UniPayError {
  readonly code: PaymentErrorCode

  /**
   * Provider-specific error code (if any)
   * Useful for detailed error handling
   */
  readonly providerCode?: string

  /**
   * Provider's payment ID (if available)
   */
  readonly providerPaymentId?: string

  constructor(
    code: PaymentErrorCode,
    message: string,
    options?: {
      provider?: PaymentProvider
      providerCode?: string
      providerPaymentId?: string
      cause?: Error
    }
  ) {
    super(message, { provider: options?.provider, cause: options?.cause })
    this.code = code
    this.providerCode = options?.providerCode
    this.providerPaymentId = options?.providerPaymentId
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      providerCode: this.providerCode,
      providerPaymentId: this.providerPaymentId
    }
  }
}

/**
 * Thrown when payment creation fails
 *
 * Common causes:
 * - Invalid card details
 * - Insufficient funds
 * - Gateway API error
 * - Rate limiting
 *
 * @example
 * try {
 *   await client.createPayment(input)
 * } catch (error) {
 *   if (error instanceof PaymentCreationError) {
 *     console.log(`Payment failed on ${error.provider}: ${error.message}`)
 *     console.log(`Provider code: ${error.providerCode}`)
 *   }
 * }
 */
export class PaymentCreationError extends PaymentError {
  constructor(
    message: string,
    options?: {
      provider?: PaymentProvider
      providerCode?: string
      cause?: Error
    }
  ) {
    super(PaymentErrorCode.PAYMENT_CREATION_FAILED, message, options)
  }
}

/**
 * Thrown when payment is not found
 *
 * @example
 * await client.getPayment('stripe:invalid_id')
 * // throws PaymentNotFoundError
 */
export class PaymentNotFoundError extends PaymentError {
  constructor(paymentId: string, provider?: PaymentProvider) {
    super(
      PaymentErrorCode.PAYMENT_NOT_FOUND,
      `Payment '${paymentId}' not found`,
      { provider, providerPaymentId: paymentId }
    )
  }
}

/**
 * Thrown when payment retrieval fails
 *
 * Different from PaymentNotFoundError - this is for
 * network errors, API failures, etc.
 */
export class PaymentRetrievalError extends PaymentError {
  constructor(
    paymentId: string,
    reason: string,
    options?: {
      provider?: PaymentProvider
      providerCode?: string
      cause?: Error
    }
  ) {
    super(
      PaymentErrorCode.PAYMENT_RETRIEVAL_FAILED,
      `Failed to retrieve payment '${paymentId}': ${reason}`,
      { ...options, providerPaymentId: paymentId }
    )
  }
}

/**
 * Thrown when trying to capture an already captured payment
 */
export class PaymentAlreadyCapturedError extends PaymentError {
  constructor(paymentId: string, provider?: PaymentProvider) {
    super(
      PaymentErrorCode.PAYMENT_ALREADY_CAPTURED,
      `Payment '${paymentId}' has already been captured`,
      { provider, providerPaymentId: paymentId }
    )
  }
}

/**
 * Thrown when payment session has expired
 */
export class PaymentExpiredError extends PaymentError {
  constructor(paymentId: string, provider?: PaymentProvider) {
    super(
      PaymentErrorCode.PAYMENT_EXPIRED,
      `Payment '${paymentId}' has expired`,
      { provider, providerPaymentId: paymentId }
    )
  }
}

/**
 * Thrown when payment was cancelled
 */
export class PaymentCancelledError extends PaymentError {
  constructor(paymentId: string, provider?: PaymentProvider) {
    super(
      PaymentErrorCode.PAYMENT_CANCELLED,
      `Payment '${paymentId}' was cancelled`,
      { provider, providerPaymentId: paymentId }
    )
  }
}
