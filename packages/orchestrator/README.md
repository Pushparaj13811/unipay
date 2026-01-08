# @uniipay/orchestrator

Intelligent payment gateway orchestrator with automatic routing, failover support, and multi-provider management.

## Overview

`@uniipay/orchestrator` is the core package for managing multiple payment gateways in your application. It provides intelligent routing, automatic failover, and a unified API for all payment operations.

## Features

- **Multi-Gateway Support**: Configure multiple payment providers simultaneously
- **Intelligent Routing**: Route payments based on currency, amount, or custom logic
- **Automatic Failover**: Built-in redundancy for high availability
- **Unified API**: Same interface regardless of which gateway processes the payment
- **Type-Safe**: Full TypeScript support with comprehensive error types
- **Production Ready**: Thoroughly tested with 358+ test cases

## Installation

```bash
npm install @uniipay/orchestrator @uniipay/adapter-stripe @uniipay/adapter-razorpay
```

Or with pnpm:

```bash
pnpm add @uniipay/orchestrator @uniipay/adapter-stripe @uniipay/adapter-razorpay
```

## Quick Start

### Single Gateway

```typescript
import { createPaymentClient, PaymentProvider } from '@uniipay/orchestrator'
import { StripeAdapter } from '@uniipay/adapter-stripe'

const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: process.env.STRIPE_SECRET_KEY })
  ],
  webhookConfigs: [
    { provider: PaymentProvider.STRIPE, signingSecret: process.env.STRIPE_WEBHOOK_SECRET }
  ]
})

const result = await client.createPayment({
  money: { amount: 5000, currency: 'USD' },
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel'
})

console.log(result.checkoutUrl)
```

### Multiple Gateways with Routing

```typescript
import { createPaymentClient, PaymentProvider } from '@uniipay/orchestrator'
import { StripeAdapter } from '@uniipay/adapter-stripe'
import { RazorpayAdapter } from '@uniipay/adapter-razorpay'

const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: process.env.STRIPE_SECRET_KEY }),
    new RazorpayAdapter({
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET
    })
  ],
  resolutionStrategy: 'by-currency',
  webhookConfigs: [
    { provider: PaymentProvider.STRIPE, signingSecret: process.env.STRIPE_WEBHOOK_SECRET },
    { provider: PaymentProvider.RAZORPAY, signingSecret: process.env.RAZORPAY_WEBHOOK_SECRET }
  ]
})

// Automatically routes to Razorpay for INR
const payment = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel'
})
```

## Routing Strategies

### 1. First Available
Uses the first configured adapter (or `defaultProvider`).

```typescript
createPaymentClient({
  adapters: [stripeAdapter, razorpayAdapter],
  resolutionStrategy: 'first-available',
  defaultProvider: PaymentProvider.STRIPE
})
```

### 2. Round Robin
Distributes payments evenly across all adapters.

```typescript
createPaymentClient({
  adapters: [stripeAdapter, razorpayAdapter],
  resolutionStrategy: 'round-robin'
})
```

### 3. By Currency
Routes based on which adapter supports the payment currency.

```typescript
createPaymentClient({
  adapters: [stripeAdapter, razorpayAdapter],
  resolutionStrategy: 'by-currency'
})
```

### 4. By Amount
Routes based on transaction amount ranges.

```typescript
createPaymentClient({
  adapters: [razorpayAdapter, payuAdapter],
  resolutionStrategy: 'by-amount',
  amountRoutes: [
    { currency: 'INR', maxAmount: 100000, provider: PaymentProvider.RAZORPAY },
    { currency: 'INR', maxAmount: Infinity, provider: PaymentProvider.PAYU }
  ]
})
```

### 5. Custom
Implement your own routing logic.

```typescript
createPaymentClient({
  adapters: [stripeAdapter, razorpayAdapter],
  resolutionStrategy: 'custom',
  customResolver: (input, providers) => {
    if (input.money.currency === 'INR') {
      return PaymentProvider.RAZORPAY
    }
    return PaymentProvider.STRIPE
  }
})
```

## Payment Operations

### Create Payment

```typescript
const result = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  customer: {
    email: 'customer@example.com',
    phone: '+919876543210',
    name: 'John Doe'
  },
  metadata: {
    orderId: 'order-123',
    userId: 'user-456'
  }
})
```

### Get Payment

```typescript
const payment = await client.getPayment('stripe:cs_test_abc123')
console.log(payment.status) // PaymentStatus.SUCCEEDED
```

### Create Refund

```typescript
// Full refund
const refund = await client.createRefund('stripe:cs_test_abc123')

// Partial refund
const partialRefund = await client.createRefund('stripe:cs_test_abc123', {
  amount: 5000,
  reason: 'Customer request'
})
```

## Webhook Handling

```typescript
import express from 'express'

const app = express()

app.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const event = await client.handleWebhook(PaymentProvider.STRIPE, {
        rawBody: req.body.toString(),
        headers: req.headers as Record<string, string>
      })

      switch (event.eventType) {
        case WebhookEventType.PAYMENT_SUCCEEDED:
          await fulfillOrder(event.payload)
          break
        case WebhookEventType.PAYMENT_FAILED:
          await handleFailure(event.payload)
          break
      }

      res.status(200).send('OK')
    } catch (error) {
      res.status(400).send('Webhook Error')
    }
  }
)
```

## Error Handling

```typescript
import {
  PaymentCreationError,
  UnsupportedCurrencyError,
  ProviderNotFoundError
} from '@uniipay/orchestrator'

try {
  const result = await client.createPayment({ ... })
} catch (error) {
  if (error instanceof UnsupportedCurrencyError) {
    console.error(`Currency ${error.currency} not supported`)
  } else if (error instanceof PaymentCreationError) {
    console.error(`Payment failed: ${error.message}`)
  }
}
```

## Configuration Reference

### PaymentClientOptions

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `adapters` | `PaymentGatewayAdapter[]` | Yes | Array of gateway adapters |
| `resolutionStrategy` | `ProviderResolutionStrategy` | No | Routing strategy (default: 'first-available') |
| `defaultProvider` | `PaymentProvider` | No | Default provider for 'first-available' strategy |
| `customResolver` | `ProviderResolver` | No | Custom routing function (required for 'custom' strategy) |
| `amountRoutes` | `AmountRoute[]` | No | Amount-based routes (required for 'by-amount' strategy) |
| `webhookConfigs` | `WebhookConfig[]` | No | Webhook signing secrets |

## Documentation

- [Getting Started Guide](https://github.com/Pushparaj13811/unipay/blob/main/docs/getting-started.md)
- [Multi-Gateway Setup](https://github.com/Pushparaj13811/unipay/blob/main/docs/multi-gateway.md)
- [Routing Strategies](https://github.com/Pushparaj13811/unipay/blob/main/docs/routing-strategies.md)
- [API Reference](https://github.com/Pushparaj13811/unipay/blob/main/docs/api-reference.md)
- [Webhook Handling](https://github.com/Pushparaj13811/unipay/blob/main/docs/webhooks.md)
- [Error Handling](https://github.com/Pushparaj13811/unipay/blob/main/docs/error-handling.md)

## Available Adapters

- [@uniipay/adapter-stripe](https://www.npmjs.com/package/@uniipay/adapter-stripe) - Stripe payments
- [@uniipay/adapter-razorpay](https://www.npmjs.com/package/@uniipay/adapter-razorpay) - Razorpay payments (India)

## Requirements

- Node.js >= 18.x
- TypeScript >= 5.3 (for TypeScript projects)

## License

MIT

## Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/Pushparaj13811/unipay/blob/main/CONTRIBUTING.md).

## Support

- [GitHub Issues](https://github.com/Pushparaj13811/unipay/issues)
- [Documentation](https://github.com/Pushparaj13811/unipay/tree/main/docs)
