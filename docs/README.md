# UniPay Documentation

Welcome to UniPay - a unified payment orchestration library for multi-gateway payment processing.

## Documentation Index

| Document | Description |
|----------|-------------|
| [Getting Started](./getting-started.md) | Quick start guide and basic setup |
| [Configuration](./configuration.md) | Complete configuration reference |
| [Multi-Gateway Setup](./multi-gateway.md) | How to configure and use multiple payment gateways |
| [Provider Selection](./provider-selection.md) | How to specify which gateway to use for each operation |
| [Routing Strategies](./routing-strategies.md) | Built-in routing strategies and custom routing |
| [API Reference](./api-reference.md) | Complete API documentation |
| [Webhook Handling](./webhooks.md) | Webhook configuration and processing |
| [Error Handling](./error-handling.md) | Error types and handling patterns |
| [Checkout Modes](./checkout-modes.md) | Hosted checkout vs SDK integration |

## Contributing

Want to add support for a new payment gateway? See the [Implementing Adapters](../CONTRIBUTING/implementing-adapters.md) guide.

## Quick Example

```typescript
import { createPaymentClient, PaymentProvider } from '@uniipay/orchestrator'
import { StripeAdapter } from '@uniipay/adapter-stripe'
import { RazorpayAdapter } from '@uniipay/adapter-razorpay'

// Configure multiple gateways
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: 'sk_...' }),
    new RazorpayAdapter({ keyId: '...', keySecret: '...' })
  ],
  resolutionStrategy: 'by-currency',
  webhookConfigs: [
    { provider: PaymentProvider.STRIPE, signingSecret: 'whsec_...' },
    { provider: PaymentProvider.RAZORPAY, signingSecret: '...' }
  ]
})

// Create payment - automatically routes to best gateway
const payment = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel'
})

// Or force a specific gateway
const stripePayment = await client.createPayment(
  { money: { amount: 1000, currency: 'USD' }, successUrl: '...', cancelUrl: '...' },
  { provider: PaymentProvider.STRIPE }
)
```

## Core Concepts

### 1. Multi-Gateway First
UniPay is designed from the ground up for multi-gateway operation. Configure multiple payment gateways and route payments intelligently.

### 2. Unified Interface
Same API regardless of which gateway processes the payment. Switch gateways by changing config, not code.

### 3. Intelligent Routing
Built-in strategies for routing payments based on currency, amount, or custom logic.

### 4. Type-Safe
Full TypeScript support with discriminated unions and comprehensive error types.

## Package Structure

```
@uniipay/core          - Core types, interfaces, and errors
@uniipay/orchestrator  - Payment orchestration and routing
@uniipay/adapter-*     - Individual gateway adapters
```
