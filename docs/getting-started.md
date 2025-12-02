# Getting Started with UniPay

This guide will help you set up UniPay and make your first payment.

## Installation

```bash
# Install core and orchestrator
npm install @unipay/core @unipay/orchestrator

# Install adapters for your payment gateways
npm install @unipay/adapter-stripe
npm install @unipay/adapter-razorpay
npm install @unipay/adapter-payu
```

Or with pnpm:
```bash
pnpm add @unipay/core @unipay/orchestrator @unipay/adapter-stripe
```

## Basic Setup

### Single Gateway

```typescript
import { createPaymentClient, PaymentProvider } from '@unipay/orchestrator'
import { StripeAdapter } from '@unipay/adapter-stripe'

const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: process.env.STRIPE_SECRET_KEY })
  ],
  webhookConfigs: [
    {
      provider: PaymentProvider.STRIPE,
      signingSecret: process.env.STRIPE_WEBHOOK_SECRET
    }
  ]
})
```

### Multiple Gateways

```typescript
import { createPaymentClient, PaymentProvider } from '@unipay/orchestrator'
import { StripeAdapter } from '@unipay/adapter-stripe'
import { RazorpayAdapter } from '@unipay/adapter-razorpay'

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
```

## Creating a Payment

### Basic Payment

```typescript
const result = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },  // 100.00 INR (smallest unit)
  successUrl: 'https://myapp.com/success',
  cancelUrl: 'https://myapp.com/cancel'
})

console.log(result.unipayId)       // 'razorpay:order_ABC123'
console.log(result.checkoutUrl)   // Gateway's checkout URL
```

### Payment with Customer Info

```typescript
const result = await client.createPayment({
  money: { amount: 50000, currency: 'INR' },
  successUrl: 'https://myapp.com/success',
  cancelUrl: 'https://myapp.com/cancel',
  customer: {
    email: 'customer@example.com',
    phone: '+919876543210',
    name: 'John Doe'
  },
  orderId: 'order-12345',
  description: 'Premium Plan Subscription',
  metadata: {
    planId: 'premium',
    userId: 'user-789'
  }
})
```

### Specifying a Gateway

```typescript
// Let routing decide (based on currency, amount, or custom logic)
const autoRouted = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: '...',
  cancelUrl: '...'
})

// Force a specific gateway
const stripePayment = await client.createPayment(
  {
    money: { amount: 10000, currency: 'INR' },
    successUrl: '...',
    cancelUrl: '...'
  },
  { provider: PaymentProvider.STRIPE }
)
```

## Handling the Result

UniPay returns two types of results based on the checkout mode:

### Hosted Checkout (Redirect)

```typescript
const result = await client.createPayment({ ... })

if (result.checkoutMode === 'hosted') {
  // Redirect user to gateway's hosted checkout page
  res.redirect(result.checkoutUrl)
}
```

### SDK Checkout (Frontend Integration)

```typescript
const result = await client.createPayment({ ... })

if (result.checkoutMode === 'sdk') {
  // Return credentials for frontend SDK
  res.json({
    provider: result.provider,
    sdkPayload: result.sdkPayload
  })
}

// Frontend uses these credentials:
// Stripe: stripe.confirmPayment({ clientSecret: sdkPayload.clientSecret })
// Razorpay: new Razorpay({ order_id: sdkPayload.orderId })
```

## Handling Webhooks

### Setup Webhook Endpoints

```typescript
// Express.js example
import express from 'express'

const app = express()

// Separate endpoint for each gateway
app.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const event = await client.handleWebhook(PaymentProvider.STRIPE, {
        rawBody: req.body.toString(),
        headers: req.headers as Record<string, string>
      })

      await handleWebhookEvent(event)
      res.status(200).send('OK')
    } catch (error) {
      console.error('Webhook error:', error)
      res.status(400).send('Webhook Error')
    }
  }
)

app.post('/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const event = await client.handleWebhook(PaymentProvider.RAZORPAY, {
      rawBody: req.body.toString(),
      headers: req.headers as Record<string, string>
    })

    await handleWebhookEvent(event)
    res.status(200).send('OK')
  }
)
```

### Processing Webhook Events

```typescript
import { WebhookEventType, PaymentWebhookPayload } from '@unipay/core'

async function handleWebhookEvent(event: WebhookEvent) {
  switch (event.eventType) {
    case WebhookEventType.PAYMENT_SUCCEEDED:
      const payload = event.payload as PaymentWebhookPayload
      await fulfillOrder(payload.metadata?.orderId)
      break

    case WebhookEventType.PAYMENT_FAILED:
      const failedPayload = event.payload as PaymentWebhookPayload
      await handlePaymentFailure(failedPayload.providerPaymentId)
      break

    case WebhookEventType.REFUND_SUCCEEDED:
      // Handle refund completion
      break
  }
}
```

## Processing Refunds

```typescript
// Full refund
const refund = await client.createRefund('stripe:cs_test_abc123')

// Partial refund
const partialRefund = await client.createRefund('stripe:cs_test_abc123', {
  amount: 5000,  // Refund 50.00
  reason: 'Customer requested partial refund'
})

// Check refund status
const refundDetails = await client.getRefund(
  PaymentProvider.STRIPE,
  refund.providerRefundId
)
```

## Retrieving Payment Details

```typescript
// By UniPay ID (provider auto-detected)
const payment = await client.getPayment('stripe:cs_test_abc123')

// By provider-specific ID
const payment = await client.getPaymentByProviderId(
  PaymentProvider.STRIPE,
  'cs_test_abc123'
)

console.log(payment.status)        // PaymentStatus.SUCCEEDED
console.log(payment.money)         // { amount: 10000, currency: 'INR' }
console.log(payment.amountRefunded) // 5000 (if partially refunded)
```

## Error Handling

```typescript
import {
  PaymentCreationError,
  ProviderNotFoundError,
  UnsupportedCurrencyError,
  WebhookSignatureError
} from '@unipay/core'

try {
  const result = await client.createPayment({ ... })
} catch (error) {
  if (error instanceof UnsupportedCurrencyError) {
    console.error(`Currency ${error.currency} not supported by ${error.provider}`)
  } else if (error instanceof PaymentCreationError) {
    console.error(`Payment failed: ${error.message}`)
    console.error(`Provider code: ${error.providerCode}`)
  } else if (error instanceof ProviderNotFoundError) {
    console.error(`Provider ${error.provider} is not registered`)
  }
}
```

## Next Steps

- [Configuration Reference](./configuration.md) - All configuration options
- [Multi-Gateway Setup](./multi-gateway.md) - Advanced multi-gateway patterns
- [Routing Strategies](./routing-strategies.md) - How payment routing works
- [API Reference](./api-reference.md) - Complete API documentation
