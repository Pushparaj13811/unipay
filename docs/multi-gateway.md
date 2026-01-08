# Multi-Gateway Setup

UniPay is designed from the ground up for multi-gateway operation. This guide covers advanced patterns for using multiple payment gateways.

## Why Multiple Gateways?

| Reason | Example |
|--------|---------|
| **Geographic optimization** | Razorpay for India, Stripe for US/EU |
| **Cost optimization** | Route small transactions to cheaper gateway |
| **Redundancy** | Fallback if one gateway is down |
| **Feature access** | UPI via Razorpay, Apple Pay via Stripe |
| **Compliance** | Local gateways for regulatory requirements |

## Basic Multi-Gateway Setup

```typescript
import { createPaymentClient, PaymentProvider } from '@unipay/orchestrator'
import { StripeAdapter } from '@unipay/adapter-stripe'
import { RazorpayAdapter } from '@unipay/adapter-razorpay'
import { PayUAdapter } from '@unipay/adapter-payu'

const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: process.env.STRIPE_SECRET_KEY }),
    new RazorpayAdapter({
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET
    }),
    new PayUAdapter({
      merchantKey: process.env.PAYU_MERCHANT_KEY,
      salt: process.env.PAYU_SALT
    })
  ],
  defaultProvider: PaymentProvider.STRIPE,
  resolutionStrategy: 'first-available',
  webhookConfigs: [
    { provider: PaymentProvider.STRIPE, signingSecret: process.env.STRIPE_WEBHOOK_SECRET },
    { provider: PaymentProvider.RAZORPAY, signingSecret: process.env.RAZORPAY_WEBHOOK_SECRET },
    { provider: PaymentProvider.PAYU, signingSecret: process.env.PAYU_WEBHOOK_SECRET }
  ]
})
```

## Use Case 1: Geographic Routing

Route payments to local gateways based on currency.

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: '...' }),        // Global
    new RazorpayAdapter({ keyId: '...', keySecret: '...' })  // India
  ],
  resolutionStrategy: 'by-currency'
})

// INR payment → Razorpay (local gateway, lower fees)
await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: '...',
  cancelUrl: '...'
})

// USD payment → Stripe (global coverage)
await client.createPayment({
  money: { amount: 1000, currency: 'USD' },
  successUrl: '...',
  cancelUrl: '...'
})
```

## Use Case 2: Cost Optimization by Amount

Route small transactions to cheaper gateways.

```typescript
const client = createPaymentClient({
  adapters: [
    new RazorpayAdapter({ keyId: '...', keySecret: '...' }),  // Lower fees
    new PayUAdapter({ merchantKey: '...', salt: '...' })      // Better for large
  ],
  resolutionStrategy: 'by-amount',
  amountRoutes: [
    // Small INR transactions (< 1000 INR) → Razorpay
    { currency: 'INR', maxAmount: 100000, provider: PaymentProvider.RAZORPAY },
    // Large INR transactions → PayU
    { currency: 'INR', maxAmount: Infinity, provider: PaymentProvider.PAYU }
  ]
})
```

## Use Case 3: Fallback/Redundancy

Handle gateway failures gracefully.

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: '...' }),
    new RazorpayAdapter({ keyId: '...', keySecret: '...' })
  ],
  defaultProvider: PaymentProvider.STRIPE
})

// Application-level fallback
async function createPaymentWithFallback(input: CreatePaymentInput) {
  try {
    return await client.createPayment(input, {
      provider: PaymentProvider.STRIPE
    })
  } catch (error) {
    if (error instanceof PaymentCreationError) {
      console.log('Stripe failed, trying Razorpay...')
      return await client.createPayment(input, {
        provider: PaymentProvider.RAZORPAY
      })
    }
    throw error
  }
}
```

## Use Case 4: A/B Testing Gateways

Compare conversion rates between gateways.

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: '...' }),
    new RazorpayAdapter({ keyId: '...', keySecret: '...' })
  ],
  resolutionStrategy: 'custom',
  customResolver: (input, providers) => {
    // 50-50 split based on order ID hash
    const hash = hashString(input.orderId || Date.now().toString())
    const useStripe = hash % 2 === 0

    // Log for analytics
    console.log(`A/B Test: ${useStripe ? 'Stripe' : 'Razorpay'} for order ${input.orderId}`)

    return useStripe ? PaymentProvider.STRIPE : PaymentProvider.RAZORPAY
  }
})
```

## Use Case 5: Feature-Based Routing

Route to gateways that support specific features.

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: '...' }),       // Has Apple Pay
    new RazorpayAdapter({ keyId: '...', keySecret: '...' }),  // Has UPI
    new PayUAdapter({ merchantKey: '...', salt: '...' })      // Has NetBanking
  ],
  resolutionStrategy: 'custom',
  customResolver: (input, providers) => {
    const preferredMethod = input.metadata?.preferredPaymentMethod

    switch (preferredMethod) {
      case 'apple_pay':
        return PaymentProvider.STRIPE
      case 'upi':
        return PaymentProvider.RAZORPAY
      case 'netbanking':
        return PaymentProvider.PAYU
      default:
        return PaymentProvider.STRIPE
    }
  }
})
```

## Complex Multi-Gateway Routing

Combine multiple routing strategies.

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: '...' }),
    new RazorpayAdapter({ keyId: '...', keySecret: '...' }),
    new PayUAdapter({ merchantKey: '...', salt: '...' }),
    new PayPalAdapter({ clientId: '...', clientSecret: '...' })
  ],
  resolutionStrategy: 'custom',
  customResolver: (input, providers) => {
    const { amount, currency } = input.money

    // India routing
    if (currency === 'INR') {
      if (amount < 100000) {
        return PaymentProvider.RAZORPAY  // Lower fees for small amounts
      }
      return PaymentProvider.PAYU  // Better rates for large amounts
    }

    // US/EU routing
    if (['USD', 'EUR', 'GBP'].includes(currency)) {
      return PaymentProvider.STRIPE
    }

    // APAC routing
    if (['SGD', 'HKD', 'JPY'].includes(currency)) {
      return PaymentProvider.STRIPE
    }

    // Rest of world fallback
    return PaymentProvider.PAYPAL
  }
})
```

## Explicit Provider Selection

Even with routing rules, you can always override:

```typescript
// Let routing rules decide
const payment1 = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: '...',
  cancelUrl: '...'
})
// → Routes based on customResolver

// Force specific provider
const payment2 = await client.createPayment(
  {
    money: { amount: 10000, currency: 'INR' },
    successUrl: '...',
    cancelUrl: '...'
  },
  { provider: PaymentProvider.STRIPE }  // Ignore routing, use Stripe
)
```

## Checking Provider Capabilities

Before routing, check what each provider supports:

```typescript
import { hasCapability, AdapterCapability } from '@unipay/core'

// Check if a provider supports partial refunds
const stripeCapabilities = client.getProviderCapabilities(PaymentProvider.STRIPE)
if (stripeCapabilities && hasCapability(stripeCapabilities, AdapterCapability.PARTIAL_REFUND)) {
  // Safe to do partial refund with Stripe
}

// List all registered providers
const providers = client.getRegisteredProviders()
// ['stripe', 'razorpay', 'payu']

// Check if specific provider is available
if (client.isProviderAvailable(PaymentProvider.RAZORPAY)) {
  // Razorpay is registered and ready
}
```

## Webhook Handling for Multiple Gateways

Set up separate webhook endpoints for each gateway:

```typescript
// app.ts
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), webhookHandler(PaymentProvider.STRIPE))
app.post('/webhook/razorpay', express.raw({ type: 'application/json' }), webhookHandler(PaymentProvider.RAZORPAY))
app.post('/webhook/payu', express.raw({ type: 'application/json' }), webhookHandler(PaymentProvider.PAYU))

function webhookHandler(provider: PaymentProvider) {
  return async (req: Request, res: Response) => {
    try {
      const event = await client.handleWebhook(provider, {
        rawBody: req.body.toString(),
        headers: req.headers as Record<string, string>
      })

      // Same handling logic for all gateways!
      await processWebhookEvent(event)
      res.status(200).send('OK')
    } catch (error) {
      if (error instanceof WebhookSignatureError) {
        res.status(401).json({ error: 'Invalid signature' })
      } else {
        res.status(500).json({ error: 'Webhook processing failed' })
      }
    }
  }
}
```

## Best Practices

### 1. Start Simple, Add Complexity as Needed

```typescript
// Start with one gateway
const client = createPaymentClient({
  adapters: [new StripeAdapter({ apiKey: '...' })]
})

// Later, add more gateways
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: '...' }),
    new RazorpayAdapter({ keyId: '...', keySecret: '...' })
  ],
  resolutionStrategy: 'by-currency'
})
```

### 2. Always Configure Webhooks for All Gateways

```typescript
webhookConfigs: [
  { provider: PaymentProvider.STRIPE, signingSecret: '...' },
  { provider: PaymentProvider.RAZORPAY, signingSecret: '...' }
]
```

### 3. Use Environment Variables

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: process.env.STRIPE_SECRET_KEY }),
    new RazorpayAdapter({
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET
    })
  ]
})
```

### 4. Log Provider Decisions for Debugging

```typescript
customResolver: (input, providers) => {
  const provider = selectProvider(input)
  console.log(`Payment ${input.orderId}: Routing to ${provider}`)
  return provider
}
```

### 5. Store UniPay ID, Not Provider ID

```typescript
// Store unipayId (includes provider info)
await db.orders.update(orderId, {
  unipayId: result.unipayId  // 'stripe:cs_test_abc123'
})

// Later, provider is automatically detected
const payment = await client.getPayment(order.unipayId)
```
