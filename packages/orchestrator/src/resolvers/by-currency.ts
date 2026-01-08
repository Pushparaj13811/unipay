import {
  PaymentProvider,
  CreatePaymentInput,
  PaymentGatewayAdapter,
  supportsCurrency
} from '@uniipay/core'

/**
 * Currency-based resolution strategy
 *
 * Finds the first adapter that supports the payment's currency.
 * Useful for geographic routing (e.g., INR → Razorpay, USD → Stripe).
 *
 * @param input - Payment input (uses currency from money)
 * @param adapters - Registered adapters
 * @param defaultProvider - Fallback if no adapter supports the currency
 */
export function resolveByCurrency(
  input: CreatePaymentInput,
  adapters: Map<PaymentProvider, PaymentGatewayAdapter>,
  defaultProvider?: PaymentProvider
): PaymentProvider | undefined {
  const currency = input.money.currency.toUpperCase()

  // Find first adapter that supports this currency
  for (const [provider, adapter] of adapters) {
    if (supportsCurrency(adapter.capabilities, currency)) {
      return provider
    }
  }

  // Fallback to default if set
  if (defaultProvider && adapters.has(defaultProvider)) {
    return defaultProvider
  }

  // No suitable provider found
  return undefined
}
