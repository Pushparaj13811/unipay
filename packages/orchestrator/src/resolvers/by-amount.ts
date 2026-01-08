import {
  PaymentProvider,
  CreatePaymentInput,
  PaymentGatewayAdapter,
  AmountRoute
} from '@uniipay/core'

/**
 * Amount-based resolution strategy
 *
 * Routes payments to different providers based on amount ranges.
 * Useful for cost optimization (small txns → cheaper gateway).
 *
 * Routes are matched in order, so put more specific routes first.
 *
 * @param input - Payment input (uses amount and currency from money)
 * @param adapters - Registered adapters
 * @param routes - Amount routing configuration
 * @param defaultProvider - Fallback if no route matches
 *
 * @example
 * routes: [
 *   { currency: 'INR', maxAmount: 100000, provider: PaymentProvider.RAZORPAY },
 *   { currency: 'INR', maxAmount: Infinity, provider: PaymentProvider.PAYU },
 *   { currency: 'USD', maxAmount: Infinity, provider: PaymentProvider.STRIPE }
 * ]
 */
export function resolveByAmount(
  input: CreatePaymentInput,
  adapters: Map<PaymentProvider, PaymentGatewayAdapter>,
  routes: AmountRoute[],
  defaultProvider?: PaymentProvider
): PaymentProvider | undefined {
  const { amount, currency } = input.money
  const normalizedCurrency = currency.toUpperCase()

  // Find matching route
  for (const route of routes) {
    if (
      route.currency.toUpperCase() === normalizedCurrency &&
      amount <= route.maxAmount &&
      adapters.has(route.provider)
    ) {
      return route.provider
    }
  }

  // Fallback to default if set
  if (defaultProvider && adapters.has(defaultProvider)) {
    return defaultProvider
  }

  // No suitable route found
  return undefined
}
