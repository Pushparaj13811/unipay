// Adapter interface
export type { PaymentGatewayAdapter, BaseAdapterConfig } from './adapter'

// Client interface and types
export type {
  PaymentClient,
  PaymentClientOptions,
  PaymentOptions,
  ProviderResolutionStrategy,
  ProviderResolver,
  AmountRoute,
  CreatePaymentClient
} from './client'
