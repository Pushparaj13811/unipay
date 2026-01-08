import {
  PaymentProvider,
  CreatePaymentInput,
  PaymentGatewayAdapter
} from '@uniipay/core'

/**
 * First available resolution strategy
 *
 * Returns the default provider if set, otherwise the first registered adapter.
 * Simplest strategy - use when you have a primary gateway.
 */
export function resolveFirstAvailable(
  _input: CreatePaymentInput,
  adapters: Map<PaymentProvider, PaymentGatewayAdapter>,
  defaultProvider?: PaymentProvider
): PaymentProvider | undefined {
  // Use default if available and registered
  if (defaultProvider && adapters.has(defaultProvider)) {
    return defaultProvider
  }

  // Otherwise, first registered adapter
  const firstProvider = adapters.keys().next().value
  return firstProvider
}
