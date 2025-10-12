import { Money } from './money'
import { PaymentProvider, RefundStatus } from '../enums'

/**
 * Input for creating a refund
 *
 * @example
 * // Full refund
 * {}
 *
 * // Partial refund of 500 (smallest unit)
 * { amount: 500, reason: 'Customer requested partial refund' }
 */
export type CreateRefundInput = {
  /**
   * Amount to refund in smallest currency unit
   * If omitted, full payment amount is refunded
   */
  readonly amount?: number

  /** Reason for refund (shown to customer on some gateways) */
  readonly reason?: string

  /** Your internal refund reference */
  readonly refundId?: string

  /** Custom metadata */
  readonly metadata?: Readonly<Record<string, string>>

  /** Idempotency key */
  readonly idempotencyKey?: string
}

/**
 * Refund details
 */
export type Refund = {
  /** Provider that processed this refund */
  readonly provider: PaymentProvider

  /** Provider's refund ID */
  readonly providerRefundId: string

  /** Original payment's provider ID */
  readonly providerPaymentId: string

  /** UniPay correlation ID */
  readonly unipayId: string

  /** Refund status */
  readonly status: RefundStatus

  /** Refunded amount */
  readonly money: Money

  /** When refund was created */
  readonly createdAt: Date

  /** Reason provided */
  readonly reason?: string

  /** Provider failure reason (if failed) */
  readonly failureReason?: string

  /** Raw provider response */
  readonly raw: unknown
}

/**
 * List of refunds for a payment
 */
export type RefundList = {
  /** Array of refunds */
  readonly refunds: readonly Refund[]
  /** Whether more refunds exist (pagination) */
  readonly hasMore: boolean
}
