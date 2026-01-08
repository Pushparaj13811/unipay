import {
  PaymentProvider,
  CreatePaymentInput,
  PaymentGatewayAdapter
} from '@uniipay/core'

/**
 * State for round-robin resolution
 */
export type RoundRobinState = {
  currentIndex: number
}

/**
 * Create initial round-robin state
 */
export function createRoundRobinState(): RoundRobinState {
  return { currentIndex: 0 }
}

/**
 * Round-robin resolution strategy
 *
 * Rotates between available adapters on each call.
 * Useful for load distribution or A/B testing.
 *
 * @param input - Payment input (not used, but kept for interface consistency)
 * @param adapters - Registered adapters
 * @param state - Mutable state tracking current index
 */
export function resolveRoundRobin(
  _input: CreatePaymentInput,
  adapters: Map<PaymentProvider, PaymentGatewayAdapter>,
  state: RoundRobinState
): PaymentProvider | undefined {
  const providers = Array.from(adapters.keys())

  if (providers.length === 0) {
    return undefined
  }

  // Get current provider
  const provider = providers[state.currentIndex % providers.length]

  // Advance index for next call
  state.currentIndex = (state.currentIndex + 1) % providers.length

  return provider
}
