import { PaymentProvider } from '../enums'
import { UniPayError } from './base'

/**
 * Error codes for refund-related errors
 */
export const RefundErrorCode = {
  REFUND_CREATION_FAILED: 'REFUND_CREATION_FAILED',
  REFUND_NOT_FOUND: 'REFUND_NOT_FOUND',
  REFUND_RETRIEVAL_FAILED: 'REFUND_RETRIEVAL_FAILED',
  PARTIAL_REFUND_NOT_SUPPORTED: 'PARTIAL_REFUND_NOT_SUPPORTED',
  REFUND_EXCEEDS_PAYMENT: 'REFUND_EXCEEDS_PAYMENT',
  PAYMENT_NOT_REFUNDABLE: 'PAYMENT_NOT_REFUNDABLE',
  REFUND_ALREADY_PROCESSED: 'REFUND_ALREADY_PROCESSED'
} as const

export type RefundErrorCode = (typeof RefundErrorCode)[keyof typeof RefundErrorCode]

/**
 * Base class for refund-related errors
 */
export class RefundError extends UniPayError {
  readonly code: RefundErrorCode

  /**
   * Provider-specific error code (if any)
   */
  readonly providerCode?: string

  /**
   * Provider's refund ID (if available)
   */
  readonly providerRefundId?: string

  /**
   * Provider's payment ID for the refund
   */
  readonly providerPaymentId?: string

  constructor(
    code: RefundErrorCode,
    message: string,
    options?: {
      provider?: PaymentProvider
      providerCode?: string
      providerRefundId?: string
      providerPaymentId?: string
      cause?: Error
    }
  ) {
    super(message, { provider: options?.provider, cause: options?.cause })
    this.code = code
    this.providerCode = options?.providerCode
    this.providerRefundId = options?.providerRefundId
    this.providerPaymentId = options?.providerPaymentId
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      providerCode: this.providerCode,
      providerRefundId: this.providerRefundId,
      providerPaymentId: this.providerPaymentId
    }
  }
}

/**
 * Thrown when refund creation fails
 *
 * Common causes:
 * - Payment already fully refunded
 * - Gateway API error
 * - Invalid refund amount
 *
 * @example
 * try {
 *   await client.createRefund(unipayId, { amount: 500 })
 * } catch (error) {
 *   if (error instanceof RefundCreationError) {
 *     console.log(`Refund failed: ${error.message}`)
 *   }
 * }
 */
export class RefundCreationError extends RefundError {
  constructor(
    message: string,
    options?: {
      provider?: PaymentProvider
      providerCode?: string
      providerPaymentId?: string
      cause?: Error
    }
  ) {
    super(RefundErrorCode.REFUND_CREATION_FAILED, message, options)
  }
}

/**
 * Thrown when refund is not found
 */
export class RefundNotFoundError extends RefundError {
  constructor(refundId: string, provider?: PaymentProvider) {
    super(
      RefundErrorCode.REFUND_NOT_FOUND,
      `Refund '${refundId}' not found`,
      { provider, providerRefundId: refundId }
    )
  }
}

/**
 * Thrown when refund retrieval fails
 */
export class RefundRetrievalError extends RefundError {
  constructor(
    refundId: string,
    reason: string,
    options?: {
      provider?: PaymentProvider
      providerCode?: string
      cause?: Error
    }
  ) {
    super(
      RefundErrorCode.REFUND_RETRIEVAL_FAILED,
      `Failed to retrieve refund '${refundId}': ${reason}`,
      { ...options, providerRefundId: refundId }
    )
  }
}

/**
 * Thrown when partial refund is requested but not supported
 *
 * @example
 * // Provider only supports full refunds
 * await client.createRefund(unipayId, { amount: 500 })
 * // throws PartialRefundNotSupportedError
 */
export class PartialRefundNotSupportedError extends RefundError {
  constructor(provider: PaymentProvider) {
    super(
      RefundErrorCode.PARTIAL_REFUND_NOT_SUPPORTED,
      `Provider '${provider}' does not support partial refunds`,
      { provider }
    )
  }
}

/**
 * Thrown when refund amount exceeds available amount
 *
 * @example
 * // Payment was 10000, already refunded 5000, trying to refund 8000
 * await client.createRefund(unipayId, { amount: 8000 })
 * // throws RefundExceedsPaymentError
 */
export class RefundExceedsPaymentError extends RefundError {
  readonly requestedAmount: number
  readonly availableAmount: number

  constructor(
    requestedAmount: number,
    availableAmount: number,
    provider?: PaymentProvider
  ) {
    super(
      RefundErrorCode.REFUND_EXCEEDS_PAYMENT,
      `Refund amount ${requestedAmount} exceeds available amount ${availableAmount}`,
      { provider }
    )
    this.requestedAmount = requestedAmount
    this.availableAmount = availableAmount
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      requestedAmount: this.requestedAmount,
      availableAmount: this.availableAmount
    }
  }
}

/**
 * Thrown when payment cannot be refunded
 *
 * Common causes:
 * - Payment not yet captured
 * - Payment already refunded
 * - Gateway policy restrictions
 */
export class PaymentNotRefundableError extends RefundError {
  constructor(paymentId: string, reason: string, provider?: PaymentProvider) {
    super(
      RefundErrorCode.PAYMENT_NOT_REFUNDABLE,
      `Payment '${paymentId}' cannot be refunded: ${reason}`,
      { provider, providerPaymentId: paymentId }
    )
  }
}

/**
 * Thrown when refund has already been processed
 */
export class RefundAlreadyProcessedError extends RefundError {
  constructor(refundId: string, provider?: PaymentProvider) {
    super(
      RefundErrorCode.REFUND_ALREADY_PROCESSED,
      `Refund '${refundId}' has already been processed`,
      { provider, providerRefundId: refundId }
    )
  }
}
