# @uniipay/adapter-stripe

Stripe payment gateway adapter for UniPay, providing seamless integration with Stripe's payment infrastructure.

## Overview

`@uniipay/adapter-stripe` is the official Stripe adapter for the UniPay payment orchestration system. It implements the UniPay adapter interface, providing a unified API for Stripe payments.

## Features

- **Checkout Sessions**: Hosted checkout pages with customizable branding
- **Payment Intents**: Direct payment processing for custom UIs
- **Multiple Payment Methods**: Cards, Apple Pay, Google Pay, and more
- **Refund Support**: Full and partial refunds
- **Webhook Integration**: Secure webhook signature verification
- **Customer Management**: Optional Stripe customer creation and linking
- **Metadata Support**: Custom metadata for payments and refunds
- **Multi-Currency**: Support for 135+ currencies
- **Idempotency**: Built-in idempotency key support

## Installation

```bash
npm install @uniipay/orchestrator @uniipay/adapter-stripe
```

Or with pnpm:

```bash
pnpm add @uniipay/orchestrator @uniipay/adapter-stripe
```

## Quick Start

**Important**: Always use the adapter through `@uniipay/orchestrator`, not directly.

```typescript
import { createPaymentClient, PaymentProvider } from '@uniipay/orchestrator'
import { StripeAdapter } from '@uniipay/adapter-stripe'

const client = createPaymentClient({
  adapters: [
    new StripeAdapter({
      apiKey: process.env.STRIPE_SECRET_KEY
    })
  ],
  webhookConfigs: [
    {
      provider: PaymentProvider.STRIPE,
      signingSecret: process.env.STRIPE_WEBHOOK_SECRET
    }
  ]
})

// Create a payment
const result = await client.createPayment({
  money: { amount: 5000, currency: 'USD' }, // $50.00
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  customer: {
    email: 'customer@example.com'
  }
})

console.log(result.checkoutUrl) // Redirect user here
```

## Configuration

### StripeAdapterConfig

```typescript
new StripeAdapter({
  apiKey: 'sk_test_...',      // Required: Stripe secret key
  apiVersion: '2023-10-16',    // Optional: API version (default: latest)
  sandbox: true,               // Optional: Test mode (default: false)
  timeout: 30000,              // Optional: Request timeout (default: 30000ms)
  maxRetries: 3                // Optional: Retry attempts (default: 3)
})
```

### Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Supported Features

### Checkout Modes

- ✅ **Hosted Checkout**: Stripe-hosted checkout page
- ✅ **SDK Checkout**: Client-side integration with Stripe.js

### Payment Operations

- ✅ Create payments (Checkout Sessions & Payment Intents)
- ✅ Retrieve payment details
- ✅ Full refunds
- ✅ Partial refunds
- ✅ Multiple refunds per payment
- ✅ List refunds

### Webhook Events

Supported webhook events:

- `payment.created` → `PAYMENT_CREATED`
- `payment.processing` → `PAYMENT_PROCESSING`
- `payment.succeeded` → `PAYMENT_SUCCEEDED`
- `payment.failed` → `PAYMENT_FAILED`
- `payment.canceled` → `PAYMENT_CANCELLED`
- `refund.created` → `REFUND_CREATED`
- `refund.succeeded` → `REFUND_SUCCEEDED`
- `refund.failed` → `REFUND_FAILED`

### Supported Currencies

Supports 135+ currencies including:
- USD, EUR, GBP, CAD, AUD
- INR, JPY, CNY, SGD, HKD
- [Full list](https://stripe.com/docs/currencies)

### Payment Methods

- Credit/Debit Cards (Visa, Mastercard, Amex, etc.)
- Apple Pay
- Google Pay
- ACH Direct Debit
- SEPA Direct Debit
- And more (via Stripe Checkout)

## Usage Examples

### Create Payment with Customer Info

```typescript
const result = await client.createPayment({
  money: { amount: 10000, currency: 'USD' },
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  customer: {
    email: 'customer@example.com',
    name: 'John Doe',
    billingAddress: {
      line1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94111',
      country: 'US'
    }
  },
  description: 'Premium Plan Subscription',
  metadata: {
    orderId: 'order-123',
    userId: 'user-456'
  }
})
```

### Handle Webhooks

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

      if (event.eventType === WebhookEventType.PAYMENT_SUCCEEDED) {
        const payload = event.payload as PaymentWebhookPayload
        await fulfillOrder(payload.metadata?.orderId)
      }

      res.status(200).send('OK')
    } catch (error) {
      if (error instanceof WebhookSignatureError) {
        return res.status(401).send('Invalid signature')
      }
      res.status(400).send('Webhook Error')
    }
  }
)
```

### Create Refund

```typescript
// Full refund
const refund = await client.createRefund('stripe:cs_test_abc123')

// Partial refund
const partialRefund = await client.createRefund('stripe:cs_test_abc123', {
  amount: 2500, // $25.00
  reason: 'Customer requested partial refund'
})
```

### Multi-Gateway Setup

Use Stripe alongside other gateways:

```typescript
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

// USD payments → Stripe
// INR payments → Razorpay
```

## Adapter Capabilities

```typescript
{
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', /* +129 more */],
  features: [
    AdapterCapability.HOSTED_CHECKOUT,
    AdapterCapability.SDK_CHECKOUT,
    AdapterCapability.PARTIAL_REFUND,
    AdapterCapability.FULL_REFUND,
    AdapterCapability.MULTIPLE_REFUNDS,
    AdapterCapability.WEBHOOKS,
    AdapterCapability.PAYMENT_RETRIEVAL,
    AdapterCapability.METADATA,
    AdapterCapability.IDEMPOTENCY,
    AdapterCapability.MULTI_CURRENCY,
    AdapterCapability.SUBSCRIPTIONS,
    AdapterCapability.CARDS
  ]
}
```

## Testing

Get your test API keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys).

Use Stripe's [test cards](https://stripe.com/docs/testing):

- `4242 4242 4242 4242` - Successful payment
- `4000 0000 0000 9995` - Declined payment
- `4000 0025 0000 3155` - Requires authentication (3D Secure)

## Requirements

- Node.js >= 18.x
- Stripe account with API keys
- Stripe SDK ^14.0.0 (automatically installed)

## Documentation

- [UniPay Documentation](https://github.com/Pushparaj13811/unipay/tree/main/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Getting Started Guide](https://github.com/Pushparaj13811/unipay/blob/main/docs/getting-started.md)
- [API Reference](https://github.com/Pushparaj13811/unipay/blob/main/docs/api-reference.md)

## Related Packages

- [@uniipay/core](https://www.npmjs.com/package/@uniipay/core) - Core types and interfaces
- [@uniipay/orchestrator](https://www.npmjs.com/package/@uniipay/orchestrator) - Payment orchestration
- [@uniipay/adapter-razorpay](https://www.npmjs.com/package/@uniipay/adapter-razorpay) - Razorpay adapter

## License

MIT

## Support

- [GitHub Issues](https://github.com/Pushparaj13811/unipay/issues)
- [Stripe Support](https://support.stripe.com/)
