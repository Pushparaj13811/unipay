// ═══════════════════════════════════════════════════════════════════════════════
// @uniipay/core - Core types, interfaces, and errors for UniPay
// ═══════════════════════════════════════════════════════════════════════════════

// Enums
export {
  PaymentStatus,
  RefundStatus,
  PaymentProvider,
  CheckoutMode,
  WebhookEventType,
  AdapterCapability
} from './enums'

// Types
export type {
  // Money
  Money,
  // Customer
  Address,
  CustomerInfo,
  // Payment
  CreatePaymentInput,
  CreatePaymentResult,
  HostedCheckoutResult,
  SdkCheckoutResult,
  SdkPayload,
  Payment,
  // Refund
  CreateRefundInput,
  Refund,
  RefundList,
  // Webhook
  WebhookRequest,
  WebhookVerificationResult,
  WebhookEvent,
  WebhookPayload,
  PaymentWebhookPayload,
  RefundWebhookPayload,
  UnknownWebhookPayload,
  WebhookConfig,
  // Capability
  AdapterCapabilities,
  AdapterLimits
} from './types'

// Capability helper functions
export { hasCapability, supportsCurrency } from './types'

// Interfaces
export type {
  // Adapter
  PaymentGatewayAdapter,
  BaseAdapterConfig,
  // Client
  PaymentClient,
  PaymentClientOptions,
  PaymentOptions,
  ProviderResolutionStrategy,
  ProviderResolver,
  AmountRoute,
  CreatePaymentClient
} from './interfaces'

// Errors
export {
  // Base
  UniPayError,
  // Configuration
  ConfigurationError,
  ConfigurationErrorCode,
  InvalidProviderConfigError,
  MissingProviderError,
  DuplicateProviderError,
  InvalidResolutionStrategyError,
  MissingWebhookConfigError,
  // Provider
  ProviderResolutionError,
  ProviderErrorCode,
  NoProviderAvailableError,
  ProviderNotFoundError,
  UnsupportedCapabilityError,
  UnsupportedCurrencyError,
  UnsupportedCheckoutModeError,
  // Payment
  PaymentError,
  PaymentErrorCode,
  PaymentCreationError,
  PaymentNotFoundError,
  PaymentRetrievalError,
  PaymentAlreadyCapturedError,
  PaymentExpiredError,
  PaymentCancelledError,
  // Refund
  RefundError,
  RefundErrorCode,
  RefundCreationError,
  RefundNotFoundError,
  RefundRetrievalError,
  PartialRefundNotSupportedError,
  RefundExceedsPaymentError,
  PaymentNotRefundableError,
  RefundAlreadyProcessedError,
  // Webhook
  WebhookError,
  WebhookErrorCode,
  WebhookSignatureError,
  WebhookParsingError,
  WebhookProviderNotConfiguredError,
  WebhookTimestampExpiredError,
  // Validation
  ValidationError,
  ValidationErrorCode,
  InvalidAmountError,
  InvalidCurrencyError,
  InvalidUrlError,
  InvalidUnipayIdError,
  MissingRequiredFieldError,
  InvalidMetadataError
} from './errors'

// Utils
export {
  createUnipayId,
  parseUnipayId,
  isValidUnipayId,
  getProviderFromUnipayId
} from './utils'

export type { ParsedUnipayId } from './utils'
