# Checkout Modes

UniPay supports two checkout modes: **Hosted Checkout** and **SDK Checkout**. This guide explains both modes and when to use each.

## Overview

| Mode | Description | User Experience |
|------|-------------|-----------------|
| **Hosted** | Redirect to gateway's payment page | User leaves your site |
| **SDK** | Embed gateway's SDK in your page | User stays on your site |

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CHECKOUT MODE COMPARISON                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   HOSTED CHECKOUT                      SDK CHECKOUT                     │
│   ─────────────────                    ────────────────                 │
│                                                                          │
│   ┌──────────────┐                     ┌──────────────┐                 │
│   │  Your Site   │                     │  Your Site   │                 │
│   │              │                     │  ┌────────┐  │                 │
│   │  [Pay Now]   │                     │  │ Payment│  │                 │
│   └──────┬───────┘                     │  │  Modal │  │                 │
│          │                             │  │        │  │                 │
│          │ Redirect                    │  └────────┘  │                 │
│          ▼                             └──────────────┘                 │
│   ┌──────────────┐                                                      │
│   │   Gateway    │                     User never leaves                │
│   │   Payment    │                     your website                     │
│   │   Page       │                                                      │
│   └──────┬───────┘                                                      │
│          │                                                               │
│          │ Redirect back                                                 │
│          ▼                                                               │
│   ┌──────────────┐                                                      │
│   │  Your Site   │                                                      │
│   │  (Success)   │                                                      │
│   └──────────────┘                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Hosted Checkout

The simplest integration - redirect users to the gateway's secure payment page.

### When to Use

- Quick integration without frontend SDK
- Maximum PCI compliance (zero card data touches your servers)
- Mobile web where redirects are acceptable
- When you don't need customized payment UI

### Implementation

```typescript
// Create payment - get hosted checkout URL
const result = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: 'https://yoursite.com/payment/success',
  cancelUrl: 'https://yoursite.com/payment/cancel',
  customer: {
    email: 'customer@example.com',
    name: 'John Doe'
  },
  metadata: {
    orderId: 'order-123'
  }
})

// Check checkout mode
if (result.checkoutMode === 'hosted') {
  // Redirect user to gateway's payment page
  res.redirect(result.checkoutUrl)
}
```

### Result Type

```typescript
type HostedCheckoutResult = {
  checkoutMode: 'hosted'
  provider: PaymentProvider
  providerPaymentId: string
  unipayId: string
  status: PaymentStatus
  checkoutUrl: string          // Redirect here
  expiresAt?: Date
  metadata?: Record<string, string>
  raw: unknown
}
```

### Success/Cancel Handling

After payment, the gateway redirects back:

```typescript
// pages/payment/success.ts
app.get('/payment/success', async (req, res) => {
  // Show "Payment Processing" message
  // DO NOT fulfill order here - wait for webhook

  res.render('payment-processing', {
    message: 'Your payment is being processed...'
  })
})

// pages/payment/cancel.ts
app.get('/payment/cancel', async (req, res) => {
  res.render('payment-cancelled', {
    message: 'Payment was cancelled. Your order is not confirmed.'
  })
})
```

### Gateway Support

| Provider | Hosted Checkout |
|----------|-----------------|
| Stripe | Checkout Sessions |
| Razorpay | Payment Links |
| PayU | Hosted Checkout |
| PayPal | PayPal Checkout |

## SDK Checkout

Embed the gateway's SDK to show payment UI within your page.

### When to Use

- Seamless user experience (no redirects)
- Custom payment flow design
- Real-time payment status updates
- Native mobile app integration
- When UX is critical

### Implementation

#### Backend: Create Payment Session

```typescript
// POST /api/create-payment
app.post('/api/create-payment', async (req, res) => {
  const result = await client.createPayment({
    money: { amount: req.body.amount, currency: 'INR' },
    successUrl: 'https://yoursite.com/success',
    cancelUrl: 'https://yoursite.com/cancel',
    preferredCheckoutMode: 'sdk',  // Request SDK mode
    customer: {
      email: req.body.email
    },
    metadata: {
      orderId: req.body.orderId
    }
  })

  if (result.checkoutMode === 'sdk') {
    // Return SDK payload to frontend
    res.json({
      provider: result.provider,
      sdkPayload: result.sdkPayload
    })
  } else {
    // Fallback to hosted if SDK not available
    res.json({
      provider: result.provider,
      checkoutUrl: result.checkoutUrl
    })
  }
})
```

#### Frontend: Initialize SDK

```typescript
// Frontend JavaScript
async function initiatePayment(orderId: string, amount: number) {
  // Get SDK payload from backend
  const response = await fetch('/api/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, amount, email: 'user@example.com' })
  })

  const { provider, sdkPayload, checkoutUrl } = await response.json()

  // Handle based on what's available
  if (sdkPayload) {
    // SDK checkout
    switch (provider) {
      case 'razorpay':
        openRazorpayCheckout(sdkPayload)
        break
      case 'stripe':
        openStripeCheckout(sdkPayload)
        break
      default:
        window.location.href = checkoutUrl
    }
  } else {
    // Fallback to hosted
    window.location.href = checkoutUrl
  }
}
```

### Result Type

```typescript
type SdkCheckoutResult = {
  checkoutMode: 'sdk'
  provider: PaymentProvider
  providerPaymentId: string
  unipayId: string
  status: PaymentStatus
  sdkPayload: SdkPayload      // Pass to frontend SDK
  expiresAt?: Date
  metadata?: Record<string, string>
  raw: unknown
}

type SdkPayload = {
  provider: PaymentProvider
  data: Record<string, unknown>  // Provider-specific SDK config
}
```

### Razorpay SDK Example

```html
<!-- Include Razorpay SDK -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>

<script>
function openRazorpayCheckout(sdkPayload) {
  const options = {
    key: sdkPayload.data.key,
    amount: sdkPayload.data.amount,
    currency: sdkPayload.data.currency,
    order_id: sdkPayload.data.orderId,
    name: 'Your Company',
    description: 'Order Payment',
    prefill: {
      email: sdkPayload.data.email,
      contact: sdkPayload.data.phone
    },
    handler: function(response) {
      // Payment successful on frontend
      // Verify with webhook (don't trust this alone)
      verifyPayment(response)
    },
    modal: {
      ondismiss: function() {
        // User closed modal
        handlePaymentCancelled()
      }
    }
  }

  const razorpay = new Razorpay(options)
  razorpay.open()
}
</script>
```

### Stripe SDK Example

```html
<!-- Include Stripe.js -->
<script src="https://js.stripe.com/v3/"></script>

<script>
async function openStripeCheckout(sdkPayload) {
  const stripe = Stripe(sdkPayload.data.publishableKey)

  // For Stripe Elements
  if (sdkPayload.data.clientSecret) {
    const elements = stripe.elements({
      clientSecret: sdkPayload.data.clientSecret
    })

    const paymentElement = elements.create('payment')
    paymentElement.mount('#payment-element')

    // Handle form submission
    document.getElementById('payment-form').addEventListener('submit', async (e) => {
      e.preventDefault()

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment/complete'
        }
      })

      if (error) {
        showError(error.message)
      }
    })
  }

  // For Checkout Sessions redirect
  if (sdkPayload.data.sessionId) {
    await stripe.redirectToCheckout({
      sessionId: sdkPayload.data.sessionId
    })
  }
}
</script>
```

### Gateway Support

| Provider | SDK Checkout | SDK Type |
|----------|--------------|----------|
| Stripe | Yes | Stripe.js, Elements |
| Razorpay | Yes | Razorpay.js |
| PayU | Limited | PayU SDK |
| PayPal | Yes | PayPal JS SDK |

## Handling Both Modes

Use discriminated unions to handle both checkout modes:

```typescript
const result = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
  preferredCheckoutMode: 'sdk'  // Prefer SDK, fallback to hosted
})

// TypeScript discriminates based on checkoutMode
if (result.checkoutMode === 'hosted') {
  // result is HostedCheckoutResult
  console.log('Redirect to:', result.checkoutUrl)
  res.redirect(result.checkoutUrl)

} else if (result.checkoutMode === 'sdk') {
  // result is SdkCheckoutResult
  console.log('SDK payload:', result.sdkPayload)
  res.json({ sdkPayload: result.sdkPayload })
}
```

## Preferring a Mode

Use `preferredCheckoutMode` to request a specific mode:

```typescript
// Prefer SDK mode
const result = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: '...',
  cancelUrl: '...',
  preferredCheckoutMode: 'sdk'
})

// Prefer hosted mode
const result = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: '...',
  cancelUrl: '...',
  preferredCheckoutMode: 'hosted'
})
```

**Note:** The actual mode depends on provider capabilities. If the preferred mode isn't available, UniPay falls back to what's supported.

## Checking Provider Capabilities

```typescript
import { hasCapability, AdapterCapability } from '@uniipay/core'

const capabilities = client.getProviderCapabilities(PaymentProvider.RAZORPAY)

if (capabilities) {
  const hasHosted = hasCapability(capabilities, AdapterCapability.HOSTED_CHECKOUT)
  const hasSdk = hasCapability(capabilities, AdapterCapability.SDK_CHECKOUT)

  console.log('Razorpay supports:')
  console.log('- Hosted checkout:', hasHosted)
  console.log('- SDK checkout:', hasSdk)
}
```

## Complete Example: Adaptive Checkout

```typescript
// Backend: /api/checkout
import { createPaymentClient, PaymentProvider, CheckoutMode } from '@uniipay/orchestrator'

app.post('/api/checkout', async (req, res) => {
  const { orderId, amount, currency, preferSdk } = req.body

  try {
    const result = await client.createPayment({
      money: { amount, currency },
      successUrl: `${process.env.APP_URL}/checkout/success?orderId=${orderId}`,
      cancelUrl: `${process.env.APP_URL}/checkout/cancel?orderId=${orderId}`,
      preferredCheckoutMode: preferSdk ? 'sdk' : 'hosted',
      metadata: { orderId }
    })

    // Store payment reference
    await db.orders.update({
      where: { id: orderId },
      data: {
        unipayId: result.unipayId,
        paymentProvider: result.provider,
        paymentStatus: 'pending'
      }
    })

    // Return appropriate response
    if (result.checkoutMode === 'sdk') {
      res.json({
        mode: 'sdk',
        provider: result.provider,
        payload: result.sdkPayload
      })
    } else {
      res.json({
        mode: 'redirect',
        url: result.checkoutUrl
      })
    }

  } catch (error) {
    console.error('Checkout error:', error)
    res.status(500).json({ error: 'Failed to create checkout' })
  }
})
```

```typescript
// Frontend: checkout.ts
async function startCheckout(orderId: string, preferSdk: boolean = true) {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      amount: cart.total,
      currency: 'INR',
      preferSdk
    })
  })

  const data = await response.json()

  if (data.mode === 'redirect') {
    // Redirect to hosted checkout
    window.location.href = data.url
  } else {
    // Open SDK checkout
    openSdkCheckout(data.provider, data.payload)
  }
}

function openSdkCheckout(provider: string, payload: any) {
  switch (provider) {
    case 'razorpay':
      const rzp = new Razorpay({
        ...payload.data,
        handler: handleRazorpaySuccess,
        modal: { ondismiss: handlePaymentCancelled }
      })
      rzp.open()
      break

    case 'stripe':
      // Use Stripe Elements or redirect
      if (payload.data.sessionId) {
        stripe.redirectToCheckout({ sessionId: payload.data.sessionId })
      }
      break

    default:
      console.error('Unknown provider:', provider)
  }
}
```

## Best Practices

### 1. Always Handle Both Modes

Even if you prefer SDK, always handle hosted fallback:

```typescript
if (result.checkoutMode === 'sdk') {
  // SDK flow
} else {
  // Hosted fallback
  window.location.href = result.checkoutUrl
}
```

### 2. Never Trust Frontend Success Callbacks

SDK success callbacks indicate the user completed payment, but **always verify via webhook**:

```typescript
// SDK callback - just update UI
handler: function(response) {
  showMessage('Payment processing...')
  // Don't fulfill order here!
}

// Webhook - actually fulfill order
app.post('/webhook/razorpay', async (req, res) => {
  const event = await client.handleWebhook(...)
  if (event.eventType === WebhookEventType.PAYMENT_SUCCEEDED) {
    await fulfillOrder(event.payload.metadata.orderId)
  }
})
```

### 3. Handle Modal Dismissal

Users might close the payment modal without completing:

```typescript
modal: {
  ondismiss: function() {
    // Update UI to show payment was cancelled
    showMessage('Payment cancelled')
    // Optionally offer to retry
    showRetryButton()
  }
}
```

### 4. Test Both Modes

Always test both hosted and SDK modes in development:

```typescript
// Development: Force hosted mode for testing
const result = await client.createPayment({
  ...input,
  preferredCheckoutMode: process.env.FORCE_HOSTED ? 'hosted' : 'sdk'
})
```
