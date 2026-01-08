# Routing Strategies

UniPay provides built-in strategies for automatically selecting payment gateways. This guide covers all available strategies and how to implement custom routing logic.

## Overview

When multiple gateways are configured, the orchestrator needs to decide which one to use for each payment. Routing strategies automate this decision.

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ ... }),
    new RazorpayAdapter({ ... }),
    new PayUAdapter({ ... })
  ],
  resolutionStrategy: 'by-currency',  // Choose strategy here
  // ... additional strategy-specific config
})
```

## Available Strategies

| Strategy | Use Case | Configuration |
|----------|----------|---------------|
| `first-available` | Single gateway or simple setup | `defaultProvider` (optional) |
| `round-robin` | Load distribution, A/B testing | None |
| `by-currency` | Geographic routing | None (uses adapter capabilities) |
| `by-amount` | Cost optimization | `amountRoutes` (required) |
| `custom` | Complex logic | `customResolver` (required) |

## Strategy: first-available

Uses the default provider or the first registered adapter.

### Configuration

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ ... }),
    new RazorpayAdapter({ ... })
  ],
  resolutionStrategy: 'first-available',
  defaultProvider: PaymentProvider.STRIPE  // Optional
})
```

### Behavior

1. If `defaultProvider` is set and registered, use it
2. Otherwise, use the first adapter in the `adapters` array

### When to Use

- Single gateway setup
- Simple multi-gateway with a clear primary gateway
- Getting started before implementing complex routing

## Strategy: round-robin

Rotates between available gateways on each payment.

### Configuration

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ ... }),
    new RazorpayAdapter({ ... })
  ],
  resolutionStrategy: 'round-robin'
})
```

### Behavior

Cycles through adapters in order:
- Payment 1 → Stripe
- Payment 2 → Razorpay
- Payment 3 → Stripe
- Payment 4 → Razorpay
- ...

The state is maintained internally across requests.

### When to Use

- Distributing load across gateways
- A/B testing conversion rates
- Testing failover scenarios

### Note

Round-robin state is per-instance. In distributed systems, each instance maintains its own counter.

## Strategy: by-currency

Routes payments to gateways that support the payment's currency.

### Configuration

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ ... }),     // Supports USD, EUR, GBP, INR
    new RazorpayAdapter({ ... })    // Supports INR
  ],
  resolutionStrategy: 'by-currency',
  defaultProvider: PaymentProvider.STRIPE  // Fallback
})
```

### Behavior

1. Finds the first adapter whose `supportedCurrencies` includes the payment currency
2. Falls back to `defaultProvider` if no match
3. Throws `NoProviderAvailableError` if no suitable gateway

### Adapter Currency Declaration

Adapters declare supported currencies in their capabilities:

```typescript
class RazorpayAdapter implements PaymentGatewayAdapter {
  readonly capabilities: AdapterCapabilities = {
    provider: PaymentProvider.RAZORPAY,
    supportedCurrencies: ['INR'],  // Only INR
    // ...
  }
}
```

### When to Use

- Geographic routing (local gateways for local currencies)
- Minimizing currency conversion fees
- Compliance with local payment regulations

### Example

```typescript
// INR payment → First adapter supporting INR (Razorpay)
await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  ...
})

// USD payment → First adapter supporting USD (Stripe)
await client.createPayment({
  money: { amount: 1000, currency: 'USD' },
  ...
})
```

## Strategy: by-amount

Routes payments based on amount ranges per currency.

### Configuration

```typescript
const client = createPaymentClient({
  adapters: [
    new RazorpayAdapter({ ... }),
    new PayUAdapter({ ... }),
    new StripeAdapter({ ... })
  ],
  resolutionStrategy: 'by-amount',
  amountRoutes: [
    // Small INR payments → Razorpay (lower fees)
    { currency: 'INR', maxAmount: 100000, provider: PaymentProvider.RAZORPAY },
    // Large INR payments → PayU (better rates for large)
    { currency: 'INR', maxAmount: Infinity, provider: PaymentProvider.PAYU },
    // All USD payments → Stripe
    { currency: 'USD', maxAmount: Infinity, provider: PaymentProvider.STRIPE }
  ],
  defaultProvider: PaymentProvider.STRIPE  // Fallback for unlisted currencies
})
```

### AmountRoute Structure

```typescript
interface AmountRoute {
  currency: string         // ISO currency code
  maxAmount: number        // Maximum amount (inclusive)
  provider: PaymentProvider
}
```

### Behavior

1. Routes are matched in order
2. First matching route (currency match AND amount <= maxAmount) is used
3. Falls back to `defaultProvider` if no match
4. Throws `NoProviderAvailableError` if no suitable gateway

### Route Order Matters

Define more specific routes first:

```typescript
amountRoutes: [
  // Specific: small amounts first
  { currency: 'INR', maxAmount: 50000, provider: PaymentProvider.RAZORPAY },
  { currency: 'INR', maxAmount: 200000, provider: PaymentProvider.PAYU },
  // General: catch-all last
  { currency: 'INR', maxAmount: Infinity, provider: PaymentProvider.STRIPE }
]
```

### When to Use

- Cost optimization based on transaction size
- Different gateway strengths at different price points
- Tiered pricing negotiations with gateways

## Strategy: custom

Use your own function to select gateways.

### Configuration

```typescript
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ ... }),
    new RazorpayAdapter({ ... }),
    new PayUAdapter({ ... }),
    new PayPalAdapter({ ... })
  ],
  resolutionStrategy: 'custom',
  customResolver: (input, availableProviders) => {
    // Your logic here
    return PaymentProvider.STRIPE
  }
})
```

### Resolver Function Signature

```typescript
type ProviderResolver = (
  input: CreatePaymentInput,
  availableProviders: PaymentProvider[]
) => PaymentProvider | undefined
```

**Parameters:**
- `input`: The payment input (amount, currency, customer, metadata, etc.)
- `availableProviders`: Array of registered provider identifiers

**Returns:**
- `PaymentProvider`: The selected gateway
- `undefined`: Fall back to default behavior

### Example: Geographic + Amount Routing

```typescript
customResolver: (input, providers) => {
  const { amount, currency } = input.money

  // India: Route by amount
  if (currency === 'INR') {
    if (amount < 50000) return PaymentProvider.RAZORPAY
    if (amount < 500000) return PaymentProvider.PAYU
    return PaymentProvider.STRIPE
  }

  // US/EU: Use Stripe
  if (['USD', 'EUR', 'GBP'].includes(currency)) {
    return PaymentProvider.STRIPE
  }

  // APAC: Use Stripe
  if (['SGD', 'HKD', 'JPY', 'AUD'].includes(currency)) {
    return PaymentProvider.STRIPE
  }

  // Rest of world: Use PayPal
  return PaymentProvider.PAYPAL
}
```

### Example: Customer-Based Routing

```typescript
customResolver: (input, providers) => {
  const customerTier = input.metadata?.customerTier

  // Premium customers get Stripe (better UX)
  if (customerTier === 'premium') {
    return PaymentProvider.STRIPE
  }

  // Regular customers use cost-optimized routing
  if (input.money.currency === 'INR') {
    return PaymentProvider.RAZORPAY
  }

  return PaymentProvider.STRIPE
}
```

### Example: Feature-Based Routing

```typescript
customResolver: (input, providers) => {
  const preferredMethod = input.metadata?.preferredPaymentMethod

  switch (preferredMethod) {
    case 'apple_pay':
    case 'google_pay':
      return PaymentProvider.STRIPE
    case 'upi':
      return PaymentProvider.RAZORPAY
    case 'netbanking':
      return PaymentProvider.PAYU
    case 'paypal':
      return PaymentProvider.PAYPAL
    default:
      // Default: by currency
      return input.money.currency === 'INR'
        ? PaymentProvider.RAZORPAY
        : PaymentProvider.STRIPE
  }
}
```

### Example: A/B Testing

```typescript
customResolver: (input, providers) => {
  // Hash the order ID for consistent assignment
  const hash = simpleHash(input.orderId || input.idempotencyKey || Date.now().toString())
  const bucket = hash % 100

  // 70% Stripe, 30% Razorpay
  const provider = bucket < 70
    ? PaymentProvider.STRIPE
    : PaymentProvider.RAZORPAY

  // Log for analytics
  analytics.track('payment_routing', {
    orderId: input.orderId,
    provider,
    bucket
  })

  return provider
}
```

### When to Use

- Complex business logic not covered by built-in strategies
- Multiple factors influencing gateway selection
- Dynamic routing based on real-time conditions
- A/B testing with custom allocation

## Resolution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Provider Resolution Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   client.createPayment(input, options?)                         │
│                     │                                            │
│                     ▼                                            │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 1. Explicit provider in options?                         │   │
│   │    YES → Use that provider                               │   │
│   │    NO  → Continue to step 2                              │   │
│   └─────────────────────────────────────────────────────────┘   │
│                     │                                            │
│                     ▼                                            │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 2. Apply resolution strategy                             │   │
│   │    • first-available: Use default or first adapter       │   │
│   │    • round-robin: Cycle through adapters                 │   │
│   │    • by-currency: Match currency to adapter              │   │
│   │    • by-amount: Match amount range to adapter            │   │
│   │    • custom: Call customResolver function                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                     │                                            │
│                     ▼                                            │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 3. Validate resolved provider                            │   │
│   │    • Is provider registered?                             │   │
│   │    • Does provider support the currency?                 │   │
│   │    • Does provider support the checkout mode?            │   │
│   └─────────────────────────────────────────────────────────┘   │
│                     │                                            │
│                     ▼                                            │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 4. Execute payment on selected adapter                   │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Combining with Explicit Selection

Explicit provider selection always overrides routing:

```typescript
// Routing decides
const payment1 = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  ...
})
// → Uses routing strategy

// Force specific provider
const payment2 = await client.createPayment(
  {
    money: { amount: 10000, currency: 'INR' },
    ...
  },
  { provider: PaymentProvider.STRIPE }
)
// → Uses Stripe regardless of routing
```

## Error Handling

```typescript
import {
  NoProviderAvailableError,
  ProviderNotFoundError,
  UnsupportedCurrencyError
} from '@uniipay/core'

try {
  await client.createPayment({ ... })
} catch (error) {
  if (error instanceof NoProviderAvailableError) {
    // No gateway can handle this payment
    console.error(error.message)
  }
  if (error instanceof ProviderNotFoundError) {
    // Resolver returned unregistered provider
    console.error(`Provider ${error.provider} not registered`)
  }
  if (error instanceof UnsupportedCurrencyError) {
    // Resolved provider doesn't support currency
    console.error(`${error.provider} doesn't support ${error.currency}`)
  }
}
```
