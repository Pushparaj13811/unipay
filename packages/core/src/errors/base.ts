import { PaymentProvider } from '../enums'

/**
 * Base error class for all UniPay errors
 *
 * All UniPay errors extend this class, allowing you to:
 * - Catch all UniPay errors with `catch (e) { if (e instanceof UniPayError) }`
 * - Access common properties like `code` and `provider`
 * - Get structured error information
 *
 * @example
 * try {
 *   await client.createPayment(input)
 * } catch (error) {
 *   if (error instanceof UniPayError) {
 *     console.log(error.code)      // 'PAYMENT_CREATION_FAILED'
 *     console.log(error.provider)  // 'stripe' (if provider-specific)
 *   }
 * }
 */
export abstract class UniPayError extends Error {
  /**
   * Machine-readable error code
   * Use this for programmatic error handling
   */
  abstract readonly code: string

  /**
   * Provider that generated this error (if applicable)
   */
  readonly provider?: PaymentProvider

  /**
   * Original error from provider SDK or API (if any)
   */
  readonly cause?: Error

  constructor(message: string, options?: { provider?: PaymentProvider; cause?: Error }) {
    super(message)
    this.name = this.constructor.name
    this.provider = options?.provider
    this.cause = options?.cause

    // Maintains proper stack trace for where our error was thrown (V8 engines)
    const ErrorConstructor = Error as typeof Error & {
      captureStackTrace?: (target: Error, constructor: Function) => void
    }
    if (ErrorConstructor.captureStackTrace) {
      ErrorConstructor.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Returns a JSON-serializable representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      provider: this.provider,
      cause: this.cause?.message
    }
  }
}
