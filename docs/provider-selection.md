# Provider Selection

This guide explains how to specify which payment gateway to use for each operation.

## Overview

UniPay provides two ways to select a provider:

1. **Automatic Selection**: Let routing strategies decide based on currency, amount, or custom logic
2. **Explicit Selection**: Force a specific provider for an operation

## Explicit Provider Selection

### Creating Payments

Pass `provider` in the options object to force a specific gateway:

```typescript
import { PaymentProvider } from '@uniipay/core'

// Let routing decide
const autoRouted = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel'
})

// Force Stripe
const stripePayment = await client.createPayment(
  {
    money: { amount: 10000, currency: 'INR' },
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel'
  },
  { provider: PaymentProvider.STRIPE }
)

// Force Razorpay
const razorpayPayment = await client.createPayment(
  {
    money: { amount: 10000, currency: 'INR' },
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel'
  },
  { provider: PaymentProvider.RAZORPAY }
)
```

### Retrieving Payments

#### By UniPay ID (Provider Auto-Detected)

UniPay IDs encode the provider, so routing is automatic:

```typescript
// Provider is extracted from the ID
const payment = await client.getPayment('stripe:cs_test_abc123')
// Automatically routes to Stripe

const payment2 = await client.getPayment('razorpay:order_ABC123')
// Automatically routes to Razorpay
```

#### By Provider + Provider ID

When you have the raw provider ID:

```typescript
const payment = await client.getPaymentByProviderId(
  PaymentProvider.STRIPE,
  'cs_test_abc123'
)
```

### Creating Refunds

Refunds automatically route to the gateway that processed the original payment:

```typescript
// Provider is extracted from UniPay ID
const refund = await client.createRefund('stripe:cs_test_abc123', {
  amount: 5000,
  reason: 'Customer request'
})
// Automatically routes to Stripe
```

### Retrieving Refunds

```typescript
// Explicitly specify provider
const refund = await client.getRefund(
  PaymentProvider.STRIPE,
  'ref_abc123'
)
```

### Listing Refunds

```typescript
// Provider extracted from UniPay ID
const refunds = await client.listRefunds('stripe:cs_test_abc123')
// Routes to Stripe
```

### Handling Webhooks

Always specify which provider the webhook came from:

```typescript
// From URL path parameter
app.post('/webhook/:provider', async (req, res) => {
  const provider = req.params.provider as PaymentProvider

  const event = await client.handleWebhook(provider, {
    rawBody: req.body.toString(),
    headers: req.headers as Record<string, string>
  })
})

// Or separate endpoints per gateway
app.post('/webhook/stripe', async (req, res) => {
  const event = await client.handleWebhook(PaymentProvider.STRIPE, { ... })
})

app.post('/webhook/razorpay', async (req, res) => {
  const event = await client.handleWebhook(PaymentProvider.RAZORPAY, { ... })
})
```

## UniPay ID Format

UniPay IDs are self-documenting and include the provider:

```
Format: {provider}:{providerPaymentId}

Examples:
  stripe:cs_test_a1b2c3d4e5f6
  razorpay:order_ABCdef123456
  payu:txn_1234567890
  paypal:PAY-1AB23456CD789012EF
```

### Benefits

1. **Self-documenting**: Know the gateway at a glance
2. **Automatic routing**: Operations route to the correct gateway
3. **No database lookup**: Provider info encoded in the ID
4. **Universal format**: Works for payments, refunds, etc.

### Working with UniPay IDs

```typescript
import {
  createUnipayId,
  parseUnipayId,
  isValidUnipayId,
  getProviderFromUnipayId
} from '@uniipay/core'

// Create a UniPay ID
const id = createUnipayId(PaymentProvider.STRIPE, 'cs_test_abc123')
// 'stripe:cs_test_abc123'

// Parse a UniPay ID
const { provider, providerPaymentId } = parseUnipayId('stripe:cs_test_abc123')
// { provider: 'stripe', providerPaymentId: 'cs_test_abc123' }

// Validate format
const isValid = isValidUnipayId('stripe:cs_test_abc123')  // true
const isInvalid = isValidUnipayId('invalid')              // false

// Get just the provider
const provider = getProviderFromUnipayId('stripe:cs_test_abc123')
// PaymentProvider.STRIPE
```

## Routing Priority

When creating payments, this is the priority order:

1. **Explicit provider** in `options.provider` (highest priority)
2. **Resolution strategy** result
3. **Default provider** (if strategy returns undefined)
4. **First adapter** (fallback)

```typescript
// Priority 1: Explicit provider
await client.createPayment(input, { provider: PaymentProvider.STRIPE })

// Priority 2-4: Resolution strategy decides
await client.createPayment(input)
```

## Error Handling

### Provider Not Found

```typescript
import { ProviderNotFoundError } from '@uniipay/core'

try {
  await client.createPayment(input, { provider: PaymentProvider.PAYPAL })
} catch (error) {
  if (error instanceof ProviderNotFoundError) {
    console.error(`Provider ${error.provider} is not registered`)
    // 'Provider paypal is not registered'
  }
}
```

### Invalid UniPay ID

```typescript
import { InvalidUnipayIdError } from '@uniipay/core'

try {
  await client.getPayment('invalid-format')
} catch (error) {
  if (error instanceof InvalidUnipayIdError) {
    console.error(`Invalid UniPay ID: ${error.unipayId}`)
  }
}
```

### Unsupported Currency

```typescript
import { UnsupportedCurrencyError } from '@uniipay/core'

try {
  await client.createPayment(
    { money: { amount: 1000, currency: 'XYZ' }, ... },
    { provider: PaymentProvider.STRIPE }
  )
} catch (error) {
  if (error instanceof UnsupportedCurrencyError) {
    console.error(`${error.provider} doesn't support ${error.currency}`)
  }
}
```

## Introspection Methods

Check provider availability and capabilities before operations:

```typescript
// List all registered providers
const providers = client.getRegisteredProviders()
// [PaymentProvider.STRIPE, PaymentProvider.RAZORPAY]

// Check if specific provider is available
if (client.isProviderAvailable(PaymentProvider.STRIPE)) {
  await client.createPayment(input, { provider: PaymentProvider.STRIPE })
}

// Get provider capabilities
const capabilities = client.getProviderCapabilities(PaymentProvider.STRIPE)
if (capabilities) {
  console.log('Supported currencies:', capabilities.supportedCurrencies)
  console.log('Has partial refund:', capabilities.capabilities.has(AdapterCapability.PARTIAL_REFUND))
}
```

## Complete Example

```typescript
import {
  createPaymentClient,
  PaymentProvider,
  PaymentStatus,
  ProviderNotFoundError,
  hasCapability,
  AdapterCapability
} from '@uniipay/orchestrator'

const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: '...' }),
    new RazorpayAdapter({ keyId: '...', keySecret: '...' })
  ],
  resolutionStrategy: 'by-currency'
})

async function processPayment(
  amount: number,
  currency: string,
  preferredProvider?: PaymentProvider
) {
  // Check if preferred provider is available
  if (preferredProvider && !client.isProviderAvailable(preferredProvider)) {
    console.log(`${preferredProvider} not available, using routing`)
    preferredProvider = undefined
  }

  // Create payment
  const result = await client.createPayment(
    {
      money: { amount, currency },
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    },
    preferredProvider ? { provider: preferredProvider } : undefined
  )

  console.log(`Payment created with ${result.provider}`)
  console.log(`UniPay ID: ${result.unipayId}`)

  return result
}

async function refundPayment(unipayId: string, amount?: number) {
  // Provider automatically detected from unipayId
  const provider = getProviderFromUnipayId(unipayId)

  // Check if partial refund is supported
  if (amount) {
    const capabilities = client.getProviderCapabilities(provider!)
    if (!capabilities || !hasCapability(capabilities, AdapterCapability.PARTIAL_REFUND)) {
      throw new Error(`${provider} doesn't support partial refunds`)
    }
  }

  return client.createRefund(unipayId, { amount })
}
```
