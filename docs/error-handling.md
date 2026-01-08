# Error Handling

This guide covers UniPay's error hierarchy and handling patterns.

## Overview

UniPay provides a structured error hierarchy that makes it easy to handle different failure scenarios. All errors extend from `UniPayError` and include helpful context for debugging.

## Error Hierarchy

```
UniPayError (base)
├── ConfigurationError
│   ├── MissingProviderError
│   ├── DuplicateProviderError
│   └── InvalidResolutionStrategyError
│
├── ProviderResolutionError
│   ├── NoProviderAvailableError
│   ├── ProviderNotFoundError
│   ├── UnsupportedCurrencyError
│   └── UnsupportedCheckoutModeError
│
├── PaymentError
│   ├── PaymentCreationError
│   ├── PaymentNotFoundError
│   └── PaymentRetrievalError
│
├── RefundError
│   ├── RefundCreationError
│   ├── RefundNotFoundError
│   ├── PartialRefundNotSupportedError
│   └── RefundExceedsPaymentError
│
├── WebhookError
│   ├── WebhookSignatureError
│   ├── WebhookParsingError
│   └── WebhookProviderNotConfiguredError
│
├── ValidationError
│   ├── InvalidAmountError
│   ├── InvalidCurrencyError
│   └── InvalidUnipayIdError
│
└── AdapterError
```

## Importing Errors

```typescript
import {
  // Base
  UniPayError,

  // Configuration
  ConfigurationError,
  MissingProviderError,
  DuplicateProviderError,
  InvalidResolutionStrategyError,

  // Provider Resolution
  ProviderResolutionError,
  NoProviderAvailableError,
  ProviderNotFoundError,
  UnsupportedCurrencyError,
  UnsupportedCheckoutModeError,

  // Payment
  PaymentError,
  PaymentCreationError,
  PaymentNotFoundError,
  PaymentRetrievalError,

  // Refund
  RefundError,
  RefundCreationError,
  RefundNotFoundError,
  PartialRefundNotSupportedError,
  RefundExceedsPaymentError,

  // Webhook
  WebhookError,
  WebhookSignatureError,
  WebhookParsingError,
  WebhookProviderNotConfiguredError,

  // Validation
  ValidationError,
  InvalidAmountError,
  InvalidCurrencyError,
  InvalidUnipayIdError,

  // Adapter
  AdapterError
} from '@uniipay/core'
```

## Error Types

### Configuration Errors

Thrown during client initialization when configuration is invalid.

#### MissingProviderError

```typescript
// Thrown when no adapters are provided
const client = createPaymentClient({
  adapters: []  // Error: At least one adapter is required
})
```

#### DuplicateProviderError

```typescript
// Thrown when same provider appears twice
const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: 'sk_1' }),
    new StripeAdapter({ apiKey: 'sk_2' })  // Error: Duplicate provider
  ]
})
```

#### InvalidResolutionStrategyError

```typescript
// Thrown for invalid strategy configuration
const client = createPaymentClient({
  adapters: [...],
  resolutionStrategy: 'custom'
  // Error: customResolver required when strategy is 'custom'
})

const client = createPaymentClient({
  adapters: [...],
  resolutionStrategy: 'by-amount'
  // Error: amountRoutes required when strategy is 'by-amount'
})
```

### Provider Resolution Errors

Thrown when the orchestrator cannot select a suitable provider.

#### NoProviderAvailableError

```typescript
try {
  await client.createPayment({
    money: { amount: 1000, currency: 'XYZ' },  // No provider supports XYZ
    successUrl: '...',
    cancelUrl: '...'
  })
} catch (error) {
  if (error instanceof NoProviderAvailableError) {
    console.error('No payment provider available for this request')
    console.error('Message:', error.message)
    // Suggest user try different payment method
  }
}
```

#### ProviderNotFoundError

```typescript
try {
  await client.createPayment(
    { ... },
    { provider: PaymentProvider.PAYPAL }  // PayPal not registered
  )
} catch (error) {
  if (error instanceof ProviderNotFoundError) {
    console.error(`Provider not registered: ${error.provider}`)
    console.error('Available:', client.getRegisteredProviders())
  }
}
```

#### UnsupportedCurrencyError

```typescript
try {
  await client.createPayment(
    { money: { amount: 1000, currency: 'USD' }, ... },
    { provider: PaymentProvider.RAZORPAY }  // Razorpay only supports INR
  )
} catch (error) {
  if (error instanceof UnsupportedCurrencyError) {
    console.error(`${error.provider} doesn't support ${error.currency}`)
    // Suggest alternative provider or currency
  }
}
```

#### UnsupportedCheckoutModeError

```typescript
try {
  await client.createPayment({
    money: { amount: 1000, currency: 'INR' },
    preferredCheckoutMode: 'sdk',  // Provider doesn't support SDK mode
    ...
  })
} catch (error) {
  if (error instanceof UnsupportedCheckoutModeError) {
    console.error(`${error.provider} doesn't support ${error.checkoutMode} checkout`)
  }
}
```

### Payment Errors

Thrown during payment operations.

#### PaymentCreationError

```typescript
try {
  await client.createPayment({
    money: { amount: 10000, currency: 'INR' },
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel'
  })
} catch (error) {
  if (error instanceof PaymentCreationError) {
    console.error(`Payment creation failed on ${error.provider}`)
    console.error('Reason:', error.message)
    console.error('Provider error code:', error.providerCode)
    console.error('Original error:', error.cause)

    // Log for debugging
    logPaymentError({
      provider: error.provider,
      code: error.providerCode,
      message: error.message
    })
  }
}
```

#### PaymentNotFoundError

```typescript
try {
  await client.getPayment('stripe:cs_nonexistent')
} catch (error) {
  if (error instanceof PaymentNotFoundError) {
    console.error(`Payment not found: ${error.paymentId}`)
    console.error(`Provider: ${error.provider}`)
  }
}
```

#### PaymentRetrievalError

```typescript
try {
  await client.getPayment('stripe:cs_test_abc')
} catch (error) {
  if (error instanceof PaymentRetrievalError) {
    console.error(`Failed to retrieve payment from ${error.provider}`)
    console.error('Cause:', error.cause)
    // Could be network error, API error, etc.
  }
}
```

### Refund Errors

Thrown during refund operations.

#### RefundCreationError

```typescript
try {
  await client.createRefund('stripe:cs_test_abc', {
    amount: 5000,
    reason: 'Customer request'
  })
} catch (error) {
  if (error instanceof RefundCreationError) {
    console.error(`Refund failed on ${error.provider}: ${error.message}`)
    console.error('Provider code:', error.providerCode)

    // Common reasons: already refunded, insufficient funds, etc.
  }
}
```

#### PartialRefundNotSupportedError

```typescript
try {
  await client.createRefund('payu:txn_123', {
    amount: 5000  // Partial refund
  })
} catch (error) {
  if (error instanceof PartialRefundNotSupportedError) {
    console.error(`${error.provider} doesn't support partial refunds`)
    // Offer full refund instead
  }
}
```

#### RefundExceedsPaymentError

```typescript
try {
  await client.createRefund('stripe:cs_test_abc', {
    amount: 15000  // Original payment was 10000
  })
} catch (error) {
  if (error instanceof RefundExceedsPaymentError) {
    console.error('Refund amount exceeds available:', {
      requested: error.requestedAmount,
      available: error.availableAmount
    })
  }
}
```

### Webhook Errors

Thrown during webhook processing.

#### WebhookSignatureError

```typescript
try {
  await client.handleWebhook(PaymentProvider.STRIPE, {
    rawBody: req.body.toString(),
    headers: req.headers
  })
} catch (error) {
  if (error instanceof WebhookSignatureError) {
    console.error(`Invalid signature from ${error.provider}`)
    console.error('Details:', error.message)

    // Security concern - log and investigate
    securityLog.warn('Invalid webhook signature', {
      provider: error.provider,
      ip: req.ip
    })

    return res.status(401).json({ error: 'Invalid signature' })
  }
}
```

#### WebhookParsingError

```typescript
try {
  await client.handleWebhook(PaymentProvider.RAZORPAY, request)
} catch (error) {
  if (error instanceof WebhookParsingError) {
    console.error(`Failed to parse webhook from ${error.provider}`)
    console.error('Details:', error.message)

    return res.status(400).json({ error: 'Invalid payload' })
  }
}
```

#### WebhookProviderNotConfiguredError

```typescript
try {
  await client.handleWebhook(PaymentProvider.PAYPAL, request)
} catch (error) {
  if (error instanceof WebhookProviderNotConfiguredError) {
    console.error(`Webhook not configured for ${error.provider}`)

    return res.status(500).json({ error: 'Server configuration error' })
  }
}
```

### Validation Errors

Thrown for invalid input data.

#### InvalidAmountError

```typescript
try {
  await client.createPayment({
    money: { amount: -100, currency: 'INR' },  // Negative amount
    ...
  })
} catch (error) {
  if (error instanceof InvalidAmountError) {
    console.error(`Invalid amount: ${error.amount}`)
    console.error('Reason:', error.message)
  }
}
```

#### InvalidCurrencyError

```typescript
try {
  await client.createPayment({
    money: { amount: 1000, currency: 'INVALID' },
    ...
  })
} catch (error) {
  if (error instanceof InvalidCurrencyError) {
    console.error(`Invalid currency: ${error.currency}`)
  }
}
```

#### InvalidUnipayIdError

```typescript
try {
  await client.getPayment('invalid-format')
} catch (error) {
  if (error instanceof InvalidUnipayIdError) {
    console.error(`Invalid UniPay ID: ${error.unipayId}`)
    console.error('Expected format: provider:providerPaymentId')
  }
}
```

### Adapter Errors

Generic errors from adapter implementations.

```typescript
try {
  await client.createPayment({ ... })
} catch (error) {
  if (error instanceof AdapterError) {
    console.error(`Adapter error from ${error.provider}`)
    console.error('Message:', error.message)
    console.error('Original:', error.cause)
  }
}
```

## Error Properties

### UniPayError (Base)

All errors extend `UniPayError` and have:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Error class name |
| `message` | `string` | Human-readable description |
| `cause` | `Error?` | Original error if wrapped |

### Provider-Specific Errors

Errors that involve a specific provider include:

| Property | Type | Description |
|----------|------|-------------|
| `provider` | `PaymentProvider` | The provider involved |
| `providerCode` | `string?` | Provider's error code |

## Handling Patterns

### Comprehensive Payment Error Handler

```typescript
async function createPaymentSafely(input: CreatePaymentInput) {
  try {
    return await client.createPayment(input)
  } catch (error) {
    // Configuration errors (shouldn't happen in production)
    if (error instanceof ConfigurationError) {
      console.error('Configuration error:', error.message)
      throw new Error('Payment system misconfigured')
    }

    // No suitable provider
    if (error instanceof NoProviderAvailableError) {
      throw new Error('No payment provider available for this currency')
    }

    // Provider not found
    if (error instanceof ProviderNotFoundError) {
      console.error(`Provider ${error.provider} not registered`)
      throw new Error('Payment provider not available')
    }

    // Currency not supported
    if (error instanceof UnsupportedCurrencyError) {
      throw new Error(`Currency ${error.currency} is not supported`)
    }

    // Payment creation failed at gateway
    if (error instanceof PaymentCreationError) {
      // Log for investigation
      console.error('Payment creation failed:', {
        provider: error.provider,
        code: error.providerCode,
        message: error.message
      })

      // User-friendly message
      throw new Error('Payment could not be processed. Please try again.')
    }

    // Validation errors
    if (error instanceof ValidationError) {
      throw new Error(`Invalid input: ${error.message}`)
    }

    // Unknown error
    console.error('Unexpected payment error:', error)
    throw new Error('An unexpected error occurred')
  }
}
```

### Webhook Error Handler

```typescript
function createWebhookHandler(provider: PaymentProvider) {
  return async (req: Request, res: Response) => {
    try {
      const event = await client.handleWebhook(provider, {
        rawBody: req.body.toString(),
        headers: req.headers as Record<string, string>
      })

      await processEvent(event)
      res.status(200).json({ received: true })

    } catch (error) {
      if (error instanceof WebhookSignatureError) {
        // Security issue - invalid signature
        console.warn('Invalid webhook signature:', {
          provider: error.provider,
          ip: req.ip
        })
        return res.status(401).json({ error: 'Invalid signature' })
      }

      if (error instanceof WebhookParsingError) {
        // Malformed payload
        console.error('Webhook parsing failed:', error.message)
        return res.status(400).json({ error: 'Invalid payload' })
      }

      if (error instanceof WebhookProviderNotConfiguredError) {
        // Missing config - server error
        console.error('Missing webhook config for:', error.provider)
        return res.status(500).json({ error: 'Configuration error' })
      }

      // Processing error - return 500 so gateway retries
      console.error('Webhook processing error:', error)
      return res.status(500).json({ error: 'Processing failed' })
    }
  }
}
```

### Refund with Fallback

```typescript
async function createRefundSafely(
  unipayId: string,
  amount?: number
): Promise<Refund> {
  try {
    return await client.createRefund(unipayId, { amount })
  } catch (error) {
    if (error instanceof PartialRefundNotSupportedError) {
      // Provider doesn't support partial refunds
      // Ask user if they want full refund instead
      throw new Error(
        'Partial refunds are not supported. Would you like a full refund?'
      )
    }

    if (error instanceof RefundExceedsPaymentError) {
      throw new Error(
        `Refund amount exceeds available balance of ${error.availableAmount}`
      )
    }

    if (error instanceof RefundCreationError) {
      console.error('Refund failed:', {
        provider: error.provider,
        code: error.providerCode
      })
      throw new Error('Refund could not be processed')
    }

    throw error
  }
}
```

### Type Guards

Use `instanceof` to narrow error types:

```typescript
function isPaymentError(error: unknown): error is PaymentError {
  return error instanceof PaymentError
}

function isWebhookError(error: unknown): error is WebhookError {
  return error instanceof WebhookError
}

function isUniPayError(error: unknown): error is UniPayError {
  return error instanceof UniPayError
}
```

## Best Practices

### 1. Always Catch Specific Errors First

```typescript
try {
  await client.createPayment(input)
} catch (error) {
  // Specific errors first
  if (error instanceof UnsupportedCurrencyError) { ... }
  if (error instanceof PaymentCreationError) { ... }

  // Then general categories
  if (error instanceof PaymentError) { ... }

  // Finally, base error
  if (error instanceof UniPayError) { ... }

  // Unknown errors last
  throw error
}
```

### 2. Log Provider Details for Debugging

```typescript
if (error instanceof PaymentCreationError) {
  logger.error('Payment failed', {
    provider: error.provider,
    providerCode: error.providerCode,
    message: error.message,
    stack: error.stack,
    cause: error.cause
  })
}
```

### 3. Return User-Friendly Messages

```typescript
// Don't expose internal details to users
if (error instanceof PaymentCreationError) {
  // Log the full error internally
  console.error(error)

  // Return friendly message to user
  return {
    success: false,
    message: 'Payment could not be processed. Please try again.'
  }
}
```

### 4. Handle Unknown Errors Gracefully

```typescript
try {
  await client.createPayment(input)
} catch (error) {
  if (error instanceof UniPayError) {
    // Known error - handle appropriately
    handleKnownError(error)
  } else {
    // Unknown error - log and report
    console.error('Unexpected error:', error)
    reportToErrorTracking(error)
    throw new Error('An unexpected error occurred')
  }
}
```

### 5. Use Error Boundaries in React

```typescript
class PaymentErrorBoundary extends React.Component {
  state = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error.message
    }
  }

  render() {
    if (this.state.hasError) {
      return <PaymentErrorDisplay message={this.state.errorMessage} />
    }
    return this.props.children
  }
}
```
