# @uniipay/core

Core types, interfaces, and contracts for the UniPay payment orchestration system.

## Overview

`@uniipay/core` provides the foundational TypeScript types, interfaces, and error classes used across all UniPay packages. This package defines the contracts that payment gateway adapters must implement and the data structures used throughout the system.

## Installation

```bash
npm install @uniipay/core
```

Or with pnpm:

```bash
pnpm add @uniipay/core
```

## What's Included

### Type Definitions

- **Payment Types**: `Payment`, `PaymentStatus`, `CreatePaymentInput`, `CreatePaymentResult`
- **Refund Types**: `Refund`, `RefundStatus`, `CreateRefundInput`, `RefundList`
- **Checkout Types**: `CheckoutMode`, `HostedCheckoutResult`, `SdkCheckoutResult`
- **Customer Types**: `CustomerInfo`, `Address`
- **Money Types**: `Money` (amount and currency)
- **Webhook Types**: `WebhookEvent`, `WebhookEventType`, `WebhookRequest`, `WebhookConfig`
- **Capability Types**: `AdapterCapability`, `AdapterCapabilities`

### Enums

- `PaymentProvider`: Supported payment providers (STRIPE, RAZORPAY, PAYU, etc.)
- `PaymentStatus`: Payment lifecycle states
- `RefundStatus`: Refund lifecycle states
- `CheckoutMode`: Checkout integration modes (HOSTED, SDK)
- `WebhookEventType`: Normalized webhook event types
- `AdapterCapability`: Feature flags for adapters

### Interfaces

- `PaymentGatewayAdapter`: Contract that all adapters must implement
- `PaymentClient`: Interface for the orchestrator client
- `PaymentClientOptions`: Configuration for payment clients

### Error Classes

Comprehensive error hierarchy for type-safe error handling:

- **Configuration Errors**: `DuplicateProviderError`, `MissingProviderError`, `InvalidResolutionStrategyError`
- **Payment Errors**: `PaymentCreationError`, `PaymentNotFoundError`, `UnsupportedCurrencyError`
- `RefundCreationError`, `RefundNotFoundError`, `PartialRefundNotSupportedError`
- **Webhook Errors**: `WebhookSignatureError`, `WebhookParsingError`, `MissingWebhookConfigError`
- **Provider Errors**: `ProviderNotFoundError`, `NoProviderAvailableError`
- **Validation Errors**: `ValidationError`, `InvalidUnipayIdError`

### Utility Functions

- `createUnipayId()`: Create unified payment identifier
- `parseUnipayId()`: Parse unified payment identifier
- `isValidUnipayId()`: Validate unified payment identifier format
- `getProviderFromUnipayId()`: Extract provider from unified ID
- `hasCapability()`: Check adapter capabilities
- `supportsCurrency()`: Check currency support

## Usage

This package is typically not used directly. Instead, use `@uniipay/orchestrator` which re-exports all core types:

```typescript
import {
  PaymentProvider,
  PaymentStatus,
  CreatePaymentInput,
  // ... all core types
} from '@uniipay/orchestrator'
```

### Direct Usage (Advanced)

If you're implementing a custom adapter:

```typescript
import {
  PaymentGatewayAdapter,
  PaymentProvider,
  AdapterCapability,
  CreatePaymentInput,
  CreatePaymentResult,
  Payment,
  Refund,
  WebhookEvent
} from '@uniipay/core'

export class MyCustomAdapter implements PaymentGatewayAdapter {
  readonly provider = PaymentProvider.CUSTOM

  readonly capabilities = {
    supportedCurrencies: ['USD', 'EUR'],
    features: [
      AdapterCapability.HOSTED_CHECKOUT,
      AdapterCapability.WEBHOOKS,
      AdapterCapability.PARTIAL_REFUND
    ]
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    // Implementation
  }

  // ... implement other methods
}
```

## TypeScript Support

This package is written in TypeScript and includes full type definitions. It requires TypeScript >= 5.3.

## Documentation

For complete documentation, visit:
- [UniPay Documentation](https://github.com/Pushparaj13811/unipay/tree/main/docs)
- [API Reference](https://github.com/Pushparaj13811/unipay/blob/main/docs/api-reference.md)
- [Implementing Adapters](https://github.com/Pushparaj13811/unipay/blob/main/CONTRIBUTING/implementing-adapters.md)

## Related Packages

- [@uniipay/orchestrator](https://www.npmjs.com/package/@uniipay/orchestrator) - Payment orchestration and routing
- [@uniipay/adapter-stripe](https://www.npmjs.com/package/@uniipay/adapter-stripe) - Stripe adapter
- [@uniipay/adapter-razorpay](https://www.npmjs.com/package/@uniipay/adapter-razorpay) - Razorpay adapter

## License

MIT

## Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/Pushparaj13811/unipay/blob/main/CONTRIBUTING.md).

## Support

- [GitHub Issues](https://github.com/Pushparaj13811/unipay/issues)
- [Documentation](https://github.com/Pushparaj13811/unipay/tree/main/docs)
