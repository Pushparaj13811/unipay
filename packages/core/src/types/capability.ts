import { AdapterCapability, PaymentProvider } from '../enums'

/**
 * Limits/constraints for an adapter
 */
export type AdapterLimits = {
  /** Minimum amount in smallest unit */
  readonly minAmount?: number
  /** Maximum amount in smallest unit */
  readonly maxAmount?: number
  /** Maximum metadata key-value pairs */
  readonly maxMetadataKeys?: number
  /** Maximum metadata value length */
  readonly maxMetadataValueLength?: number
}

/**
 * Capability declaration for an adapter
 *
 * Each adapter declares what features it supports.
 * The orchestrator uses this for routing decisions.
 *
 * @example
 * {
 *   provider: PaymentProvider.STRIPE,
 *   capabilities: new Set([
 *     AdapterCapability.HOSTED_CHECKOUT,
 *     AdapterCapability.PARTIAL_REFUND,
 *     AdapterCapability.WEBHOOKS
 *   ]),
 *   supportedCurrencies: ['USD', 'EUR', 'INR'],
 *   limits: { minAmount: 50 }
 * }
 */
export type AdapterCapabilities = {
  /** Provider this capability set belongs to */
  readonly provider: PaymentProvider

  /** Set of supported capabilities */
  readonly capabilities: ReadonlySet<AdapterCapability>

  /** ISO-4217 currency codes supported */
  readonly supportedCurrencies: readonly string[]

  /** Payment methods supported (gateway-specific) */
  readonly supportedPaymentMethods?: readonly string[]

  /** Amount and metadata limits */
  readonly limits?: AdapterLimits
}

/**
 * Check if an adapter supports a specific capability
 *
 * @example
 * if (hasCapability(adapter.capabilities, AdapterCapability.PARTIAL_REFUND)) {
 *   // Safe to do partial refund
 * }
 */
export function hasCapability(
  capabilities: AdapterCapabilities,
  capability: AdapterCapability
): boolean {
  return capabilities.capabilities.has(capability)
}

/**
 * Check if an adapter supports a specific currency
 */
export function supportsCurrency(
  capabilities: AdapterCapabilities,
  currency: string
): boolean {
  return capabilities.supportedCurrencies.includes(currency.toUpperCase())
}
