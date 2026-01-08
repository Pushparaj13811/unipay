# Configuration Reference

Complete reference for all UniPay configuration options.

## PaymentClientOptions

Main configuration object passed to `createPaymentClient()`.

```typescript
import { createPaymentClient, PaymentProvider } from '@uniipay/orchestrator'

const client = createPaymentClient({
  // Required: At least one adapter
  adapters: [...],

  // Optional configurations
  defaultProvider: PaymentProvider.STRIPE,
  resolutionStrategy: 'by-currency',
  customResolver: (input, providers) => { ... },
  amountRoutes: [...],
  webhookConfigs: [...]
})
```

### adapters (required)

Array of gateway adapter instances. At least one adapter must be provided.

```typescript
adapters: [
  new StripeAdapter({ apiKey: 'sk_...' }),
  new RazorpayAdapter({ keyId: '...', keySecret: '...' }),
  new PayUAdapter({ merchantKey: '...', salt: '...' })
]
```

**Rules:**
- Cannot have duplicate providers (throws `DuplicateProviderError`)
- Order matters for `first-available` and `round-robin` strategies

### defaultProvider

Default gateway when using `first-available` strategy and no explicit provider is specified.

```typescript
defaultProvider: PaymentProvider.STRIPE
```

If not set, the first adapter in the `adapters` array is used.

### resolutionStrategy

How to select which gateway handles a payment when multiple are configured.

```typescript
resolutionStrategy: 'first-available' | 'round-robin' | 'by-currency' | 'by-amount' | 'custom'
```

| Strategy | Description | Required Config |
|----------|-------------|-----------------|
| `first-available` | Uses `defaultProvider` or first adapter | None |
| `round-robin` | Rotates between adapters | None |
| `by-currency` | Routes based on currency support | None (uses adapter capabilities) |
| `by-amount` | Routes based on amount ranges | `amountRoutes` |
| `custom` | Your custom function decides | `customResolver` |

Default: `'first-available'`

### customResolver

Custom function for selecting a gateway. Required when `resolutionStrategy` is `'custom'`.

```typescript
customResolver: (
  input: CreatePaymentInput,
  availableProviders: PaymentProvider[]
) => PaymentProvider | undefined

// Example
customResolver: (input, providers) => {
  if (input.money.currency === 'INR') {
    return input.money.amount < 100000
      ? PaymentProvider.RAZORPAY
      : PaymentProvider.PAYU
  }
  return PaymentProvider.STRIPE
}
```

### amountRoutes

Amount-based routing configuration. Required when `resolutionStrategy` is `'by-amount'`.

```typescript
amountRoutes: AmountRoute[]

// Example
amountRoutes: [
  { currency: 'INR', maxAmount: 100000, provider: PaymentProvider.RAZORPAY },
  { currency: 'INR', maxAmount: Infinity, provider: PaymentProvider.PAYU },
  { currency: 'USD', maxAmount: Infinity, provider: PaymentProvider.STRIPE }
]
```

Routes are matched in order. Use `Infinity` for "no maximum".

### webhookConfigs

Webhook signing secrets for each gateway that receives webhooks.

```typescript
webhookConfigs: WebhookConfig[]

// Example
webhookConfigs: [
  {
    provider: PaymentProvider.STRIPE,
    signingSecret: 'whsec_...',
    timestampToleranceSeconds: 300  // Optional, default varies by gateway
  },
  {
    provider: PaymentProvider.RAZORPAY,
    signingSecret: 'your_razorpay_webhook_secret'
  }
]
```

---

## CreatePaymentInput

Input object for creating payments.

```typescript
interface CreatePaymentInput {
  // Required
  money: Money
  successUrl: string
  cancelUrl: string

  // Optional
  customer?: CustomerInfo
  orderId?: string
  description?: string
  metadata?: Record<string, string>
  idempotencyKey?: string
  expiresInSeconds?: number
  preferredCheckoutMode?: CheckoutMode
}
```

### money (required)

Amount and currency for the payment.

```typescript
money: {
  amount: 10000,    // In smallest currency unit (cents, paise, etc.)
  currency: 'INR'   // ISO-4217 currency code
}
```

**Examples:**
- `{ amount: 10000, currency: 'INR' }` = 100.00 INR
- `{ amount: 999, currency: 'USD' }` = 9.99 USD
- `{ amount: 5000, currency: 'EUR' }` = 50.00 EUR

### successUrl / cancelUrl (required)

URLs for redirecting after payment completion.

```typescript
successUrl: 'https://myapp.com/payment/success?session={CHECKOUT_SESSION_ID}'
cancelUrl: 'https://myapp.com/payment/cancelled'
```

### customer

Customer information. Some gateways require certain fields.

```typescript
customer: {
  id: 'cust_123',                     // Your internal customer ID
  email: 'customer@example.com',      // Required by most gateways
  phone: '+919876543210',             // Required by Indian gateways
  name: 'John Doe',
  billingAddress: {
    line1: '123 Main St',
    line2: 'Apt 4',
    city: 'Mumbai',
    state: 'MH',
    postalCode: '400001',
    country: 'IN'                     // ISO-3166-1 alpha-2
  }
}
```

### orderId

Your internal order/transaction reference.

```typescript
orderId: 'order-12345'
```

### description

Description shown to customer on checkout page.

```typescript
description: 'Premium Plan - Monthly Subscription'
```

### metadata

Custom key-value pairs stored with the payment and returned in webhooks.

```typescript
metadata: {
  orderId: 'order-123',
  userId: 'user-456',
  plan: 'premium'
}
```

**Limits:** Gateway-specific (typically 50 keys, 500 char values).

### idempotencyKey

Prevents duplicate payments from retries.

```typescript
idempotencyKey: 'unique-request-id-12345'
```

### expiresInSeconds

Session expiry time. Support varies by gateway.

```typescript
expiresInSeconds: 1800  // 30 minutes
```

### preferredCheckoutMode

Request specific checkout mode (hosted redirect or SDK integration).

```typescript
preferredCheckoutMode: CheckoutMode.HOSTED  // or CheckoutMode.SDK
```

---

## PaymentOptions

Per-request options for payment operations.

```typescript
interface PaymentOptions {
  provider?: PaymentProvider  // Force specific gateway
}
```

### Usage

```typescript
// Let routing decide
await client.createPayment(input)

// Force specific gateway
await client.createPayment(input, { provider: PaymentProvider.STRIPE })
```

---

## CreateRefundInput

Input for creating refunds.

```typescript
interface CreateRefundInput {
  amount?: number              // Partial refund amount (omit for full)
  reason?: string              // Shown to customer on some gateways
  refundId?: string            // Your internal refund reference
  metadata?: Record<string, string>
  idempotencyKey?: string
}
```

### Examples

```typescript
// Full refund
await client.createRefund('stripe:cs_test_abc123')

// Partial refund
await client.createRefund('stripe:cs_test_abc123', {
  amount: 5000,
  reason: 'Customer requested partial refund'
})

// With idempotency
await client.createRefund('stripe:cs_test_abc123', {
  idempotencyKey: 'refund-request-12345'
})
```

---

## WebhookConfig

Configuration for webhook signature verification.

```typescript
interface WebhookConfig {
  provider: PaymentProvider
  signingSecret: string
  timestampToleranceSeconds?: number
}
```

### Gateway-Specific Secrets

| Gateway | Secret Format | Where to Find |
|---------|--------------|---------------|
| Stripe | `whsec_...` | Webhook endpoint settings in Dashboard |
| Razorpay | String | Webhook settings in Dashboard |
| PayU | Merchant salt | Merchant account settings |

---

## Adapter Configuration

Each adapter has its own configuration options.

### Common Options (BaseAdapterConfig)

```typescript
interface BaseAdapterConfig {
  sandbox?: boolean      // Test mode (default: false)
  timeout?: number       // Request timeout ms (default: 30000)
  maxRetries?: number    // Retry attempts (default: 3)
}
```

### Stripe Adapter

```typescript
new StripeAdapter({
  apiKey: 'sk_test_...',        // Required: Stripe secret key
  apiVersion: '2023-10-16',     // Optional: API version
  sandbox: true,                // Optional: Use test mode
  timeout: 30000,
  maxRetries: 3
})
```

### Razorpay Adapter

```typescript
new RazorpayAdapter({
  keyId: 'rzp_test_...',        // Required: Razorpay key ID
  keySecret: '...',              // Required: Razorpay key secret
  sandbox: true,
  timeout: 30000
})
```

### PayU Adapter

```typescript
new PayUAdapter({
  merchantKey: '...',           // Required: Merchant key
  salt: '...',                   // Required: Merchant salt
  sandbox: true,
  timeout: 30000
})
```

---

## Environment Variables

Recommended environment variable setup:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# PayU
PAYU_MERCHANT_KEY=...
PAYU_SALT=...
```

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: process.env.STRIPE_SECRET_KEY }),
    new RazorpayAdapter({
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET
    })
  ],
  webhookConfigs: [
    { provider: PaymentProvider.STRIPE, signingSecret: process.env.STRIPE_WEBHOOK_SECRET },
    { provider: PaymentProvider.RAZORPAY, signingSecret: process.env.RAZORPAY_WEBHOOK_SECRET }
  ]
})
```
