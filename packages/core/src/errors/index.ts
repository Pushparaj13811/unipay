// Base error
export { UniPayError } from './base'

// Configuration errors
export {
  ConfigurationError,
  ConfigurationErrorCode,
  InvalidProviderConfigError,
  MissingProviderError,
  DuplicateProviderError,
  InvalidResolutionStrategyError,
  MissingWebhookConfigError
} from './configuration'

// Provider resolution errors
export {
  ProviderResolutionError,
  ProviderErrorCode,
  NoProviderAvailableError,
  ProviderNotFoundError,
  UnsupportedCapabilityError,
  UnsupportedCurrencyError,
  UnsupportedCheckoutModeError
} from './provider'

// Payment errors
export {
  PaymentError,
  PaymentErrorCode,
  PaymentCreationError,
  PaymentNotFoundError,
  PaymentRetrievalError,
  PaymentAlreadyCapturedError,
  PaymentExpiredError,
  PaymentCancelledError
} from './payment'

// Refund errors
export {
  RefundError,
  RefundErrorCode,
  RefundCreationError,
  RefundNotFoundError,
  RefundRetrievalError,
  PartialRefundNotSupportedError,
  RefundExceedsPaymentError,
  PaymentNotRefundableError,
  RefundAlreadyProcessedError
} from './refund'

// Webhook errors
export {
  WebhookError,
  WebhookErrorCode,
  WebhookSignatureError,
  WebhookParsingError,
  WebhookProviderNotConfiguredError,
  WebhookTimestampExpiredError
} from './webhook'

// Validation errors
export {
  ValidationError,
  ValidationErrorCode,
  InvalidAmountError,
  InvalidCurrencyError,
  InvalidUrlError,
  InvalidUnipayIdError,
  MissingRequiredFieldError,
  InvalidMetadataError
} from './validation'
