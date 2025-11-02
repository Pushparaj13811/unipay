import { PaymentProvider } from '../enums'
import { InvalidUnipayIdError } from '../errors'

/**
 * Parsed UniPay ID components
 */
export type ParsedUnipayId = {
  /** Provider that processed this payment */
  provider: PaymentProvider

  /** Provider's payment/refund ID */
  providerPaymentId: string
}

/**
 * UniPay ID separator
 */
const SEPARATOR = ':'

/**
 * Valid provider values for validation
 */
const VALID_PROVIDERS = new Set(Object.values(PaymentProvider))

/**
 * Create a UniPay ID from provider and payment ID
 *
 * UniPay ID format: `provider:providerPaymentId`
 *
 * This creates a self-documenting ID that:
 * - Identifies which gateway processed the payment
 * - Can be used directly for routing operations
 * - Doesn't require database lookups to determine provider
 *
 * @param provider - Payment provider enum value
 * @param providerPaymentId - Gateway's payment ID
 * @returns UniPay ID string
 *
 * @example
 * createUnipayId(PaymentProvider.STRIPE, 'cs_test_abc123')
 * // => 'stripe:cs_test_abc123'
 *
 * createUnipayId(PaymentProvider.RAZORPAY, 'order_ABC123')
 * // => 'razorpay:order_ABC123'
 */
export function createUnipayId(
  provider: PaymentProvider,
  providerPaymentId: string
): string {
  if (!providerPaymentId || providerPaymentId.trim() === '') {
    throw new Error('providerPaymentId cannot be empty')
  }

  return `${provider}${SEPARATOR}${providerPaymentId}`
}

/**
 * Parse a UniPay ID into its components
 *
 * Extracts the provider and provider-specific ID from a UniPay ID.
 * Used by orchestrator to route operations to the correct adapter.
 *
 * @param unipayId - UniPay ID string
 * @returns Parsed components (provider, providerPaymentId)
 * @throws InvalidUnipayIdError - If format is invalid
 *
 * @example
 * parseUnipayId('stripe:cs_test_abc123')
 * // => { provider: PaymentProvider.STRIPE, providerPaymentId: 'cs_test_abc123' }
 *
 * parseUnipayId('razorpay:order_ABC123')
 * // => { provider: PaymentProvider.RAZORPAY, providerPaymentId: 'order_ABC123' }
 *
 * parseUnipayId('invalid')
 * // throws InvalidUnipayIdError
 */
export function parseUnipayId(unipayId: string): ParsedUnipayId {
  if (!unipayId || typeof unipayId !== 'string') {
    throw new InvalidUnipayIdError(String(unipayId))
  }

  const separatorIndex = unipayId.indexOf(SEPARATOR)

  if (separatorIndex === -1) {
    throw new InvalidUnipayIdError(unipayId)
  }

  const provider = unipayId.slice(0, separatorIndex)
  const providerPaymentId = unipayId.slice(separatorIndex + 1)

  // Validate provider
  if (!VALID_PROVIDERS.has(provider as PaymentProvider)) {
    throw new InvalidUnipayIdError(unipayId)
  }

  // Validate providerPaymentId is not empty
  if (!providerPaymentId || providerPaymentId.trim() === '') {
    throw new InvalidUnipayIdError(unipayId)
  }

  return {
    provider: provider as PaymentProvider,
    providerPaymentId
  }
}

/**
 * Check if a string is a valid UniPay ID format
 *
 * Non-throwing validation check.
 * Useful for conditional logic without try/catch.
 *
 * @param value - String to validate
 * @returns true if valid UniPay ID format
 *
 * @example
 * isValidUnipayId('stripe:cs_test_abc123')  // true
 * isValidUnipayId('invalid')                 // false
 * isValidUnipayId('unknown:id123')           // false (invalid provider)
 */
export function isValidUnipayId(value: string): boolean {
  try {
    parseUnipayId(value)
    return true
  } catch {
    return false
  }
}

/**
 * Extract provider from UniPay ID without full parsing
 *
 * Faster than full parse when you only need the provider.
 * Returns undefined if invalid, doesn't throw.
 *
 * @param unipayId - UniPay ID string
 * @returns Provider or undefined if invalid
 *
 * @example
 * getProviderFromUnipayId('stripe:cs_test_abc123')
 * // => PaymentProvider.STRIPE
 *
 * getProviderFromUnipayId('invalid')
 * // => undefined
 */
export function getProviderFromUnipayId(
  unipayId: string
): PaymentProvider | undefined {
  if (!unipayId || typeof unipayId !== 'string') {
    return undefined
  }

  const separatorIndex = unipayId.indexOf(SEPARATOR)
  if (separatorIndex === -1) {
    return undefined
  }

  const provider = unipayId.slice(0, separatorIndex)

  if (!VALID_PROVIDERS.has(provider as PaymentProvider)) {
    return undefined
  }

  return provider as PaymentProvider
}
