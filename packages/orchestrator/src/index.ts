// ═══════════════════════════════════════════════════════════════════════════════
// @unipay/orchestrator - Payment orchestration for multi-gateway setups
// ═══════════════════════════════════════════════════════════════════════════════

// Main exports
export { PaymentOrchestrator, createPaymentClient } from './orchestrator'

// Types (re-exports from core + internal)
export type {
  PaymentClientOptions,
  PaymentOptions,
  ProviderResolutionStrategy,
  ProviderResolver,
  AmountRoute,
  RoundRobinState
} from './types'

// Resolution strategies (for advanced use)
export {
  resolveFirstAvailable,
  resolveRoundRobin,
  createRoundRobinState,
  resolveByCurrency,
  resolveByAmount
} from './resolvers'

// Re-export everything from core for convenience
// This allows users to import from @unipay/orchestrator only
export * from '@unipay/core'
