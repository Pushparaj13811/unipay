# Webhook Handling

This guide covers webhook configuration and processing in UniPay.

## Overview

Payment gateways send webhooks to notify you of events like successful payments, failed payments, and refunds. UniPay normalizes these gateway-specific events into a unified format.

## Configuration

### Webhook Secrets

Each gateway requires a signing secret to verify webhook authenticity:

```typescript
const client = createPaymentClient({
  adapters: [...],
  webhookConfigs: [
    {
      provider: PaymentProvider.STRIPE,
      signingSecret: process.env.STRIPE_WEBHOOK_SECRET,  // whsec_...
      timestampToleranceSeconds: 300  // Optional
    },
    {
      provider: PaymentProvider.RAZORPAY,
      signingSecret: process.env.RAZORPAY_WEBHOOK_SECRET
    },
    {
      provider: PaymentProvider.PAYU,
      signingSecret: process.env.PAYU_SALT
    }
  ]
})
```

### Where to Find Secrets

| Gateway | Secret Location | Format |
|---------|-----------------|--------|
| Stripe | Dashboard → Developers → Webhooks → Endpoint → Signing secret | `whsec_...` |
| Razorpay | Dashboard → Settings → Webhooks → Secret | String |
| PayU | Account settings → Merchant salt | String |

## Setting Up Endpoints

### Separate Endpoints (Recommended)

```typescript
import express from 'express'
import { PaymentProvider } from '@unipay/core'

const app = express()

// IMPORTANT: Use raw body parser for webhook endpoints
app.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  createWebhookHandler(PaymentProvider.STRIPE)
)

app.post('/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  createWebhookHandler(PaymentProvider.RAZORPAY)
)

app.post('/webhook/payu',
  express.raw({ type: 'application/json' }),
  createWebhookHandler(PaymentProvider.PAYU)
)

function createWebhookHandler(provider: PaymentProvider) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const event = await client.handleWebhook(provider, {
        rawBody: req.body.toString(),
        headers: req.headers as Record<string, string>
      })

      await processWebhookEvent(event)
      res.status(200).json({ received: true })
    } catch (error) {
      handleWebhookError(error, res)
    }
  }
}
```

### Dynamic Provider Endpoint

```typescript
app.post('/webhook/:provider',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const provider = req.params.provider as PaymentProvider

    // Validate provider
    if (!client.isProviderAvailable(provider)) {
      return res.status(404).json({ error: 'Unknown provider' })
    }

    try {
      const event = await client.handleWebhook(provider, {
        rawBody: req.body.toString(),
        headers: req.headers as Record<string, string>
      })

      await processWebhookEvent(event)
      res.status(200).json({ received: true })
    } catch (error) {
      handleWebhookError(error, res)
    }
  }
)
```

## Processing Events

### Normalized Event Structure

All gateway events are normalized to:

```typescript
interface WebhookEvent {
  provider: PaymentProvider        // Which gateway sent this
  eventType: WebhookEventType      // Normalized event type
  providerEventId: string          // For deduplication
  providerEventType: string        // Original gateway event name
  timestamp: Date                  // When event occurred
  payload: WebhookPayload          // Event-specific data
  raw: unknown                     // Original gateway event
}
```

### Event Types

```typescript
enum WebhookEventType {
  // Payment events
  PAYMENT_CREATED = 'payment.created'
  PAYMENT_PENDING = 'payment.pending'
  PAYMENT_PROCESSING = 'payment.processing'
  PAYMENT_SUCCEEDED = 'payment.succeeded'
  PAYMENT_FAILED = 'payment.failed'
  PAYMENT_CANCELLED = 'payment.cancelled'
  PAYMENT_EXPIRED = 'payment.expired'

  // Refund events
  REFUND_CREATED = 'refund.created'
  REFUND_PROCESSING = 'refund.processing'
  REFUND_SUCCEEDED = 'refund.succeeded'
  REFUND_FAILED = 'refund.failed'

  // Unknown
  UNKNOWN = 'unknown'
}
```

### Event Type Mapping

| UniPay Event | Stripe | Razorpay |
|--------------|--------|----------|
| PAYMENT_SUCCEEDED | checkout.session.completed, payment_intent.succeeded | payment.captured, order.paid |
| PAYMENT_FAILED | payment_intent.payment_failed, checkout.session.expired | payment.failed |
| REFUND_SUCCEEDED | charge.refunded | refund.processed |
| REFUND_FAILED | refund.failed | refund.failed |

### Handling Payment Events

```typescript
import {
  WebhookEventType,
  PaymentWebhookPayload,
  RefundWebhookPayload
} from '@unipay/core'

async function processWebhookEvent(event: WebhookEvent) {
  // Idempotency: Check if already processed
  const processed = await db.webhookEvents.findUnique({
    where: { providerEventId: event.providerEventId }
  })
  if (processed) {
    console.log('Event already processed, skipping')
    return
  }

  switch (event.eventType) {
    case WebhookEventType.PAYMENT_SUCCEEDED:
      await handlePaymentSuccess(event.payload as PaymentWebhookPayload)
      break

    case WebhookEventType.PAYMENT_FAILED:
      await handlePaymentFailure(event.payload as PaymentWebhookPayload)
      break

    case WebhookEventType.REFUND_SUCCEEDED:
      await handleRefundSuccess(event.payload as RefundWebhookPayload)
      break

    case WebhookEventType.REFUND_FAILED:
      await handleRefundFailure(event.payload as RefundWebhookPayload)
      break

    default:
      console.log(`Unhandled event type: ${event.eventType}`)
  }

  // Mark as processed
  await db.webhookEvents.create({
    data: { providerEventId: event.providerEventId, processedAt: new Date() }
  })
}

async function handlePaymentSuccess(payload: PaymentWebhookPayload) {
  const { providerPaymentId, status, money, metadata } = payload
  const orderId = metadata?.orderId

  if (!orderId) {
    console.error('Missing orderId in payment metadata')
    return
  }

  // Update order status
  await db.orders.update({
    where: { id: orderId },
    data: {
      status: 'paid',
      paidAmount: money.amount,
      paidAt: new Date()
    }
  })

  // Fulfill order
  await fulfillOrder(orderId)

  // Send confirmation email
  await sendPaymentConfirmation(orderId)
}

async function handlePaymentFailure(payload: PaymentWebhookPayload) {
  const { providerPaymentId, failureReason, failureCode, metadata } = payload
  const orderId = metadata?.orderId

  await db.orders.update({
    where: { id: orderId },
    data: {
      status: 'payment_failed',
      failureReason,
      failureCode
    }
  })

  // Notify customer
  await sendPaymentFailureNotification(orderId, failureReason)
}

async function handleRefundSuccess(payload: RefundWebhookPayload) {
  const { providerRefundId, providerPaymentId, money } = payload

  await db.refunds.update({
    where: { providerRefundId },
    data: { status: 'completed', completedAt: new Date() }
  })

  // Update order's refunded amount
  await db.orders.update({
    where: { providerPaymentId },
    data: {
      refundedAmount: { increment: money.amount }
    }
  })
}
```

### Payload Types

#### PaymentWebhookPayload

```typescript
type PaymentWebhookPayload = {
  type: 'payment'
  providerPaymentId: string
  status: PaymentStatus
  money: Money
  metadata?: Record<string, string>
  failureReason?: string
  failureCode?: string
}
```

#### RefundWebhookPayload

```typescript
type RefundWebhookPayload = {
  type: 'refund'
  providerRefundId: string
  providerPaymentId: string
  status: RefundStatus
  money: Money
  failureReason?: string
}
```

#### UnknownWebhookPayload

```typescript
type UnknownWebhookPayload = {
  type: 'unknown'
  data: unknown
}
```

## Error Handling

### Webhook Errors

```typescript
import {
  WebhookSignatureError,
  WebhookParsingError,
  WebhookProviderNotConfiguredError
} from '@unipay/core'

function handleWebhookError(error: unknown, res: express.Response) {
  if (error instanceof WebhookSignatureError) {
    // Security issue - invalid signature
    console.error(`Invalid webhook signature from ${error.provider}:`, error.message)
    return res.status(401).json({ error: 'Invalid signature' })
  }

  if (error instanceof WebhookParsingError) {
    // Malformed payload
    console.error(`Failed to parse webhook from ${error.provider}:`, error.message)
    return res.status(400).json({ error: 'Invalid payload' })
  }

  if (error instanceof WebhookProviderNotConfiguredError) {
    // Missing webhook config
    console.error(`Webhook config missing for ${error.provider}`)
    return res.status(500).json({ error: 'Server configuration error' })
  }

  // Unknown error
  console.error('Unexpected webhook error:', error)
  return res.status(500).json({ error: 'Internal server error' })
}
```

### Signature Verification Only

If you need to verify signature separately:

```typescript
const result = client.verifyWebhookSignature(PaymentProvider.STRIPE, {
  rawBody: req.body.toString(),
  headers: req.headers as Record<string, string>
})

if (!result.isValid) {
  console.error('Invalid signature:', result.error)
  return res.status(401).json({ error: 'Invalid signature' })
}

// Manually parse the event
const rawEvent = JSON.parse(req.body.toString())
// Process raw event...
```

## Best Practices

### 1. Always Use Raw Body

Webhook signature verification requires the raw body, not parsed JSON:

```typescript
// CORRECT
app.post('/webhook', express.raw({ type: 'application/json' }), handler)

// WRONG - JSON parsing breaks signature verification
app.post('/webhook', express.json(), handler)  // Don't do this
```

### 2. Implement Idempotency

Webhooks may be delivered multiple times:

```typescript
async function processWebhookEvent(event: WebhookEvent) {
  // Check if already processed using providerEventId
  const exists = await db.webhookEvents.findUnique({
    where: { providerEventId: event.providerEventId }
  })

  if (exists) {
    console.log('Duplicate webhook, skipping')
    return
  }

  // Process event...

  // Mark as processed
  await db.webhookEvents.create({
    data: { providerEventId: event.providerEventId }
  })
}
```

### 3. Respond Quickly

Gateways expect quick responses. Process async:

```typescript
app.post('/webhook/:provider', async (req, res) => {
  const event = await client.handleWebhook(provider, request)

  // Respond immediately
  res.status(200).json({ received: true })

  // Process async (don't await)
  processWebhookEvent(event).catch(err => {
    console.error('Webhook processing error:', err)
  })
})
```

Or use a job queue:

```typescript
app.post('/webhook/:provider', async (req, res) => {
  const event = await client.handleWebhook(provider, request)

  // Queue for processing
  await webhookQueue.add('process-webhook', { event })

  res.status(200).json({ received: true })
})
```

### 4. Log Everything

```typescript
async function processWebhookEvent(event: WebhookEvent) {
  console.log('Webhook received:', {
    provider: event.provider,
    eventType: event.eventType,
    providerEventId: event.providerEventId,
    providerEventType: event.providerEventType,
    timestamp: event.timestamp
  })

  // Process...

  console.log('Webhook processed:', {
    providerEventId: event.providerEventId,
    success: true
  })
}
```

### 5. Handle Unknown Events

Don't fail on unknown event types:

```typescript
switch (event.eventType) {
  case WebhookEventType.PAYMENT_SUCCEEDED:
    // Handle...
    break
  // ... other cases
  default:
    // Log but don't fail
    console.log(`Unhandled event type: ${event.eventType}`, {
      providerEventType: event.providerEventType
    })
}
```

### 6. Use Metadata for Context

Store order IDs and other context in payment metadata:

```typescript
// When creating payment
await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  metadata: {
    orderId: 'order-123',
    userId: 'user-456',
    productIds: 'prod-1,prod-2'
  },
  // ...
})

// In webhook handler
async function handlePaymentSuccess(payload: PaymentWebhookPayload) {
  const orderId = payload.metadata?.orderId
  const userId = payload.metadata?.userId

  // Now you have context to fulfill the order
}
```

## Testing Webhooks

### Local Development

Use tools like ngrok to expose local endpoints:

```bash
ngrok http 3000
# Use the ngrok URL in gateway webhook settings
```

### Stripe CLI

```bash
stripe listen --forward-to localhost:3000/webhook/stripe
stripe trigger payment_intent.succeeded
```

### Manual Testing

```typescript
// Test endpoint (development only)
app.post('/test-webhook/:provider', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send()
  }

  // Simulate webhook event
  const mockEvent: WebhookEvent = {
    provider: req.params.provider as PaymentProvider,
    eventType: WebhookEventType.PAYMENT_SUCCEEDED,
    providerEventId: `test_${Date.now()}`,
    providerEventType: 'test.event',
    timestamp: new Date(),
    payload: {
      type: 'payment',
      providerPaymentId: 'test_payment_123',
      status: PaymentStatus.SUCCEEDED,
      money: { amount: 10000, currency: 'INR' },
      metadata: req.body.metadata
    },
    raw: {}
  }

  await processWebhookEvent(mockEvent)
  res.json({ success: true })
})
```
