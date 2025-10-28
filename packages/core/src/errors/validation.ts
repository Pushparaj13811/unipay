import { UniPayError } from './base'

/**
 * Error codes for validation errors
 */
export const ValidationErrorCode = {
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  INVALID_URL: 'INVALID_URL',
  INVALID_UNIPAY_ID: 'INVALID_UNIPAY_ID',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_METADATA: 'INVALID_METADATA'
} as const

export type ValidationErrorCode =
  (typeof ValidationErrorCode)[keyof typeof ValidationErrorCode]

/**
 * Base class for input validation errors
 *
 * Thrown when input data is invalid before reaching the gateway.
 */
export class ValidationError extends UniPayError {
  readonly code: ValidationErrorCode

  /**
   * Field that caused the validation error
   */
  readonly field?: string

  constructor(
    code: ValidationErrorCode,
    message: string,
    field?: string
  ) {
    super(message)
    this.code = code
    this.field = field
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field
    }
  }
}

/**
 * Thrown when amount is invalid
 *
 * @example
 * // Negative amount
 * await client.createPayment({
 *   money: { amount: -100, currency: 'INR' },
 *   ...
 * })
 * // throws InvalidAmountError
 */
export class InvalidAmountError extends ValidationError {
  readonly amount: number

  constructor(amount: number, reason: string) {
    super(
      ValidationErrorCode.INVALID_AMOUNT,
      `Invalid amount ${amount}: ${reason}`,
      'money.amount'
    )
    this.amount = amount
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      amount: this.amount
    }
  }
}

/**
 * Thrown when currency code is invalid
 *
 * @example
 * await client.createPayment({
 *   money: { amount: 1000, currency: 'INVALID' },
 *   ...
 * })
 * // throws InvalidCurrencyError
 */
export class InvalidCurrencyError extends ValidationError {
  readonly currency: string

  constructor(currency: string) {
    super(
      ValidationErrorCode.INVALID_CURRENCY,
      `Invalid currency code '${currency}'. Must be ISO-4217 format.`,
      'money.currency'
    )
    this.currency = currency
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      currency: this.currency
    }
  }
}

/**
 * Thrown when URL is invalid
 *
 * @example
 * await client.createPayment({
 *   money: { amount: 1000, currency: 'INR' },
 *   successUrl: 'not-a-url',
 *   cancelUrl: 'https://example.com/cancel'
 * })
 * // throws InvalidUrlError
 */
export class InvalidUrlError extends ValidationError {
  readonly url: string

  constructor(field: string, url: string, reason?: string) {
    super(
      ValidationErrorCode.INVALID_URL,
      reason
        ? `Invalid URL for ${field}: ${reason}`
        : `Invalid URL for ${field}: '${url}'`,
      field
    )
    this.url = url
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      url: this.url
    }
  }
}

/**
 * Thrown when UniPay ID format is invalid
 *
 * @example
 * await client.getPayment('invalid-format')
 * // throws InvalidUnipayIdError
 */
export class InvalidUnipayIdError extends ValidationError {
  readonly unipayId: string

  constructor(unipayId: string) {
    super(
      ValidationErrorCode.INVALID_UNIPAY_ID,
      `Invalid UniPay ID format: '${unipayId}'. Expected format: 'provider:providerPaymentId'`,
      'unipayId'
    )
    this.unipayId = unipayId
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      unipayId: this.unipayId
    }
  }
}

/**
 * Thrown when required field is missing
 */
export class MissingRequiredFieldError extends ValidationError {
  constructor(field: string) {
    super(
      ValidationErrorCode.MISSING_REQUIRED_FIELD,
      `Missing required field: ${field}`,
      field
    )
  }
}

/**
 * Thrown when metadata is invalid
 *
 * @example
 * // Metadata value too long
 * await client.createPayment({
 *   ...
 *   metadata: { key: 'a'.repeat(10000) }
 * })
 * // throws InvalidMetadataError
 */
export class InvalidMetadataError extends ValidationError {
  constructor(reason: string) {
    super(
      ValidationErrorCode.INVALID_METADATA,
      `Invalid metadata: ${reason}`,
      'metadata'
    )
  }
}
