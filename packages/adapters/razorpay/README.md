# @uniipay/adapter-razorpay

Razorpay payment gateway adapter for UniPay, providing seamless integration with Razorpay's payment infrastructure for Indian payments.

## Overview

`@uniipay/adapter-razorpay` is the official Razorpay adapter for the UniPay payment orchestration system. It implements the UniPay adapter interface, providing a unified API for Razorpay payments with support for UPI, cards, net banking, and wallets.

## Features

- **Razorpay Orders**: Create orders with payment links
- **Multiple Payment Methods**: UPI, Cards, Net Banking, Wallets
- **Refund Support**: Full and partial refunds with instant/normal speed
- **Webhook Integration**: Secure webhook signature verification
- **Customer Management**: Optional customer creation and linking
- **Metadata Support**: Custom notes for payments and refunds
- **Indian Payment Ecosystem**: Optimized for Indian payment methods
- **Multi-Currency**: Support for INR and international currencies

## Installation

```bash
npm install @uniipay/orchestrator @uniipay/adapter-razorpay
```

Or with pnpm:

```bash
pnpm add @uniipay/orchestrator @uniipay/adapter-razorpay
```

## Quick Start

**Important**: Always use the adapter through `@uniipay/orchestrator`, not directly.

```typescript
import { createPaymentClient, PaymentProvider } from '@uniipay/orchestrator'
import { RazorpayAdapter } from '@uniipay/adapter-razorpay'

const client = createPaymentClient({
  adapters: [
    new RazorpayAdapter({
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET
    })
  ],
  webhookConfigs: [
    {
      provider: PaymentProvider.RAZORPAY,
      signingSecret: process.env.RAZORPAY_WEBHOOK_SECRET
    }
  ]
})

// Create a payment
const result = await client.createPayment({
  money: { amount: 50000, currency: 'INR' }, // ₹500.00
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  customer: {
    email: 'customer@example.com',
    phone: '+919876543210',
    name: 'Rajesh Kumar'
  }
})

console.log(result.checkoutUrl) // Redirect user here
```

## Configuration

### RazorpayAdapterConfig

```typescript
new RazorpayAdapter({
  keyId: 'rzp_test_...',       // Required: Razorpay key ID
  keySecret: '...',             // Required: Razorpay key secret
  sandbox: true,                // Optional: Test mode (default: false)
  timeout: 30000,               // Optional: Request timeout (default: 30000ms)
  maxRetries: 3                 // Optional: Retry attempts (default: 3)
})
```

### Environment Variables

```bash
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx
```

## Supported Features

### Checkout Modes

- ✅ **Hosted Checkout**: Razorpay payment link page
- ✅ **SDK Checkout**: Client-side integration with Razorpay Checkout

### Payment Operations

- ✅ Create payments (Orders & Payment Links)
- ✅ Retrieve payment details
- ✅ Full refunds
- ✅ Partial refunds
- ✅ Multiple refunds per payment
- ✅ List refunds
- ✅ Instant and normal refund speeds

### Webhook Events

Supported webhook events:

- `order.paid` → `PAYMENT_SUCCEEDED`
- `payment.authorized` → `PAYMENT_SUCCEEDED`
- `payment.captured` → `PAYMENT_SUCCEEDED`
- `payment.failed` → `PAYMENT_FAILED`
- `refund.created` → `REFUND_CREATED`
- `refund.processed` → `REFUND_SUCCEEDED`
- `refund.failed` → `REFUND_FAILED`

### Supported Currencies

Primary: **INR** (Indian Rupee)

Also supports: USD, EUR, GBP, AUD, CAD, SGD, AED, and more

### Payment Methods

- **UPI**: Google Pay, PhonePe, Paytm, BHIM
- **Cards**: Credit/Debit cards (Visa, Mastercard, Rupay, Amex)
- **Net Banking**: All major Indian banks
- **Wallets**: Paytm, PhonePe, Mobikwik, FreeCharge
- **EMI**: Credit card EMI options
- **CardLess EMI**: Providers like ZestMoney, EarlySalary

## Usage Examples

### Create Payment for Indian Customer

```typescript
const result = await client.createPayment({
  money: { amount: 100000, currency: 'INR' }, // ₹1,000.00
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  customer: {
    email: 'customer@example.com',
    phone: '+919876543210', // Required for Razorpay
    name: 'Rajesh Kumar'
  },
  description: 'Premium Membership',
  metadata: {
    orderId: 'order-123',
    userId: 'user-456',
    productId: 'prod-789'
  }
})
```

### Handle Webhooks

```typescript
import express from 'express'

const app = express()

app.post('/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const event = await client.handleWebhook(PaymentProvider.RAZORPAY, {
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
const refund = await client.createRefund('razorpay:order_abc123')

// Partial refund with instant speed
const partialRefund = await client.createRefund('razorpay:order_abc123', {
  amount: 25000, // ₹250.00
  reason: 'Customer requested partial refund',
  metadata: {
    refundSpeed: 'instant' // Razorpay-specific option
  }
})
```

### Multi-Gateway Setup (India + International)

```typescript
import { StripeAdapter } from '@uniipay/adapter-stripe'
import { RazorpayAdapter } from '@uniipay/adapter-razorpay'

const client = createPaymentClient({
  adapters: [
    new RazorpayAdapter({
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET
    }),
    new StripeAdapter({ apiKey: process.env.STRIPE_SECRET_KEY })
  ],
  resolutionStrategy: 'by-currency',
  webhookConfigs: [
    { provider: PaymentProvider.RAZORPAY, signingSecret: process.env.RAZORPAY_WEBHOOK_SECRET },
    { provider: PaymentProvider.STRIPE, signingSecret: process.env.STRIPE_WEBHOOK_SECRET }
  ]
})

// INR payments → Razorpay (local gateway, UPI support)
// USD/EUR payments → Stripe (global coverage)
```

### Amount-Based Routing

```typescript
const client = createPaymentClient({
  adapters: [razorpayAdapter, payuAdapter],
  resolutionStrategy: 'by-amount',
  amountRoutes: [
    // Small transactions → Razorpay (lower fees)
    { currency: 'INR', maxAmount: 100000, provider: PaymentProvider.RAZORPAY },
    // Large transactions → PayU (better rates)
    { currency: 'INR', maxAmount: Infinity, provider: PaymentProvider.PAYU }
  ]
})
```

## Adapter Capabilities

```typescript
{
  supportedCurrencies: ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', /* +10 more */],
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
    AdapterCapability.UPI,
    AdapterCapability.NET_BANKING,
    AdapterCapability.WALLETS,
    AdapterCapability.CARDS,
    AdapterCapability.EMI
  ]
}
```

## Testing

Get your test API keys from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys).

Use Razorpay's test payment methods:
- Test cards: [Razorpay Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)
- UPI test flow available in test mode
- Net banking test credentials provided by Razorpay

## Important Notes

### Phone Number Requirement
Razorpay requires a phone number for most payment methods. Always include `customer.phone` in your payment requests.

```typescript
customer: {
  email: 'customer@example.com',
  phone: '+919876543210' // Required
}
```

### Webhook Signature Verification
Razorpay uses a different signature verification method than Stripe. The adapter handles this automatically using the `X-Razorpay-Signature` header.

### Refund Speed
Razorpay supports instant and normal refund speeds. Specify in metadata:

```typescript
metadata: {
  refundSpeed: 'instant' // or 'normal'
}
```

## Requirements

- Node.js >= 18.x
- Razorpay account with API keys
- Razorpay SDK ^2.9.0 (automatically installed)
- Valid Indian business registration (for production)

## Documentation

- [UniPay Documentation](https://github.com/Pushparaj13811/unipay/tree/main/docs)
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Getting Started Guide](https://github.com/Pushparaj13811/unipay/blob/main/docs/getting-started.md)
- [API Reference](https://github.com/Pushparaj13811/unipay/blob/main/docs/api-reference.md)

## Related Packages

- [@uniipay/core](https://www.npmjs.com/package/@uniipay/core) - Core types and interfaces
- [@uniipay/orchestrator](https://www.npmjs.com/package/@uniipay/orchestrator) - Payment orchestration
- [@uniipay/adapter-stripe](https://www.npmjs.com/package/@uniipay/adapter-stripe) - Stripe adapter

## License

MIT

## Support

- [GitHub Issues](https://github.com/Pushparaj13811/unipay/issues)
- [Razorpay Support](https://razorpay.com/support/)
