# API Reference

Complete API documentation for UniPay.

## Table of Contents

- [createPaymentClient](#createpaymentclient)
- [PaymentClient Interface](#paymentclient-interface)
  - [createPayment](#createpayment)
  - [getPayment](#getpayment)
  - [getPaymentByProviderId](#getpaymentbyproviderid)
  - [createRefund](#createrefund)
  - [getRefund](#getrefund)
  - [listRefunds](#listrefunds)
  - [handleWebhook](#handlewebhook)
  - [verifyWebhookSignature](#verifywebhooksignature)
  - [getProviderCapabilities](#getprovidercapabilities)
  - [getRegisteredProviders](#getregisteredproviders)
  - [isProviderAvailable](#isprovideravailable)
- [Utility Functions](#utility-functions)
- [Types](#types)
- [Enums](#enums)

---

## createPaymentClient

Factory function to create a PaymentClient instance.

```typescript
function createPaymentClient(options: PaymentClientOptions): PaymentClient
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options` | `PaymentClientOptions` | Yes | Configuration options |

### Returns

`PaymentClient` - Configured payment client instance

### Example

```typescript
import { createPaymentClient, PaymentProvider } from '@uniipay/orchestrator'

const client = createPaymentClient({
  adapters: [new StripeAdapter({ apiKey: 'sk_...' })],
  webhookConfigs: [
    { provider: PaymentProvider.STRIPE, signingSecret: 'whsec_...' }
  ]
})
```

### Throws

- `MissingProviderError` - No adapters provided
- `DuplicateProviderError` - Duplicate provider in adapters
- `InvalidResolutionStrategyError` - Invalid strategy configuration

---

## PaymentClient Interface

### createPayment

Creates a payment session with the specified gateway.

```typescript
createPayment(
  input: CreatePaymentInput,
  options?: PaymentOptions
): Promise<CreatePaymentResult>
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | `CreatePaymentInput` | Yes | Payment details |
| `options` | `PaymentOptions` | No | Per-request options |

#### CreatePaymentInput

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `money` | `Money` | Yes | Amount and currency |
| `successUrl` | `string` | Yes | Redirect URL on success |
| `cancelUrl` | `string` | Yes | Redirect URL on cancel |
| `customer` | `CustomerInfo` | No | Customer information |
| `orderId` | `string` | No | Your order reference |
| `description` | `string` | No | Payment description |
| `metadata` | `Record<string, string>` | No | Custom key-value pairs |
| `idempotencyKey` | `string` | No | Prevent duplicates |
| `expiresInSeconds` | `number` | No | Session expiry |
| `preferredCheckoutMode` | `CheckoutMode` | No | 'hosted' or 'sdk' |

#### PaymentOptions

| Field | Type | Description |
|-------|------|-------------|
| `provider` | `PaymentProvider` | Force specific gateway |

#### Returns

`Promise<CreatePaymentResult>` - Either `HostedCheckoutResult` or `SdkCheckoutResult`

#### Example

```typescript
// Basic payment
const result = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel'
})

// With explicit provider
const result = await client.createPayment(
  {
    money: { amount: 10000, currency: 'INR' },
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    customer: { email: 'user@example.com' },
    metadata: { orderId: 'order-123' }
  },
  { provider: PaymentProvider.STRIPE }
)

// Handle result
if (result.checkoutMode === 'hosted') {
  redirect(result.checkoutUrl)
} else {
  sendToFrontend(result.sdkPayload)
}
```

#### Throws

- `NoProviderAvailableError` - No gateway available
- `ProviderNotFoundError` - Explicit provider not registered
- `UnsupportedCurrencyError` - Currency not supported
- `UnsupportedCheckoutModeError` - Checkout mode not supported
- `PaymentCreationError` - Gateway rejected payment
- `ValidationError` - Invalid input

---

### getPayment

Retrieves payment details by UniPay ID.

```typescript
getPayment(unipayId: string): Promise<Payment>
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `unipayId` | `string` | Yes | UniPay ID (format: `provider:id`) |

#### Returns

`Promise<Payment>` - Full payment details

#### Example

```typescript
const payment = await client.getPayment('stripe:cs_test_abc123')

console.log(payment.status)         // PaymentStatus.SUCCEEDED
console.log(payment.money)          // { amount: 10000, currency: 'INR' }
console.log(payment.amountRefunded) // 0
```

#### Throws

- `InvalidUnipayIdError` - Invalid ID format
- `ProviderNotFoundError` - Provider not registered
- `PaymentNotFoundError` - Payment doesn't exist

---

### getPaymentByProviderId

Retrieves payment using provider-specific ID.

```typescript
getPaymentByProviderId(
  provider: PaymentProvider,
  providerPaymentId: string
): Promise<Payment>
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | `PaymentProvider` | Yes | Gateway identifier |
| `providerPaymentId` | `string` | Yes | Gateway's payment ID |

#### Example

```typescript
const payment = await client.getPaymentByProviderId(
  PaymentProvider.STRIPE,
  'cs_test_abc123'
)
```

---

### createRefund

Creates a refund for a payment.

```typescript
createRefund(
  unipayId: string,
  input?: CreateRefundInput
): Promise<Refund>
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `unipayId` | `string` | Yes | UniPay ID of payment to refund |
| `input` | `CreateRefundInput` | No | Refund details |

#### CreateRefundInput

| Field | Type | Description |
|-------|------|-------------|
| `amount` | `number` | Partial refund amount (omit for full) |
| `reason` | `string` | Refund reason |
| `refundId` | `string` | Your refund reference |
| `metadata` | `Record<string, string>` | Custom metadata |
| `idempotencyKey` | `string` | Prevent duplicates |

#### Example

```typescript
// Full refund
const refund = await client.createRefund('stripe:cs_test_abc123')

// Partial refund
const refund = await client.createRefund('stripe:cs_test_abc123', {
  amount: 5000,
  reason: 'Customer request'
})
```

#### Throws

- `InvalidUnipayIdError` - Invalid UniPay ID
- `RefundCreationError` - Refund failed
- `PartialRefundNotSupportedError` - Partial refund not supported
- `RefundExceedsPaymentError` - Amount exceeds available

---

### getRefund

Retrieves refund details.

```typescript
getRefund(
  provider: PaymentProvider,
  providerRefundId: string
): Promise<Refund>
```

#### Example

```typescript
const refund = await client.getRefund(
  PaymentProvider.STRIPE,
  'ref_abc123'
)
```

---

### listRefunds

Lists all refunds for a payment.

```typescript
listRefunds(unipayId: string): Promise<RefundList>
```

#### Example

```typescript
const { refunds, hasMore } = await client.listRefunds('stripe:cs_test_abc123')

for (const refund of refunds) {
  console.log(refund.providerRefundId, refund.status)
}
```

---

### handleWebhook

Verifies and parses an incoming webhook.

```typescript
handleWebhook(
  provider: PaymentProvider,
  request: WebhookRequest
): Promise<WebhookEvent>
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | `PaymentProvider` | Yes | Gateway that sent webhook |
| `request` | `WebhookRequest` | Yes | Raw webhook request |

#### WebhookRequest

| Field | Type | Description |
|-------|------|-------------|
| `rawBody` | `string` | Raw request body (not parsed) |
| `headers` | `Record<string, string \| string[] \| undefined>` | Request headers |

#### Example

```typescript
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await client.handleWebhook(PaymentProvider.STRIPE, {
      rawBody: req.body.toString(),
      headers: req.headers as Record<string, string>
    })

    switch (event.eventType) {
      case WebhookEventType.PAYMENT_SUCCEEDED:
        await fulfillOrder(event.payload)
        break
    }

    res.status(200).send('OK')
  } catch (error) {
    if (error instanceof WebhookSignatureError) {
      res.status(401).send('Invalid signature')
    }
  }
})
```

#### Throws

- `WebhookProviderNotConfiguredError` - No webhook config
- `WebhookSignatureError` - Invalid signature
- `WebhookParsingError` - Can't parse payload

---

### verifyWebhookSignature

Verifies webhook signature without parsing.

```typescript
verifyWebhookSignature(
  provider: PaymentProvider,
  request: WebhookRequest
): WebhookVerificationResult
```

#### Returns

```typescript
interface WebhookVerificationResult {
  isValid: boolean
  error?: string
}
```

#### Example

```typescript
const result = client.verifyWebhookSignature(PaymentProvider.STRIPE, {
  rawBody: req.body.toString(),
  headers: req.headers
})

if (!result.isValid) {
  console.error('Invalid signature:', result.error)
}
```

---

### getProviderCapabilities

Gets capabilities for a registered provider.

```typescript
getProviderCapabilities(
  provider: PaymentProvider
): AdapterCapabilities | undefined
```

#### Example

```typescript
const capabilities = client.getProviderCapabilities(PaymentProvider.STRIPE)

if (capabilities) {
  console.log('Currencies:', capabilities.supportedCurrencies)
  console.log('Has partial refund:', hasCapability(capabilities, AdapterCapability.PARTIAL_REFUND))
}
```

---

### getRegisteredProviders

Lists all registered provider identifiers.

```typescript
getRegisteredProviders(): PaymentProvider[]
```

#### Example

```typescript
const providers = client.getRegisteredProviders()
// ['stripe', 'razorpay']
```

---

### isProviderAvailable

Checks if a provider is registered.

```typescript
isProviderAvailable(provider: PaymentProvider): boolean
```

#### Example

```typescript
if (client.isProviderAvailable(PaymentProvider.STRIPE)) {
  // Stripe is configured
}
```

---

## Utility Functions

### createUnipayId

Creates a UniPay ID from provider and payment ID.

```typescript
function createUnipayId(
  provider: PaymentProvider,
  providerPaymentId: string
): string
```

### parseUnipayId

Parses a UniPay ID into its components.

```typescript
function parseUnipayId(unipayId: string): ParsedUnipayId

interface ParsedUnipayId {
  provider: PaymentProvider
  providerPaymentId: string
}
```

### isValidUnipayId

Validates UniPay ID format (non-throwing).

```typescript
function isValidUnipayId(value: string): boolean
```

### getProviderFromUnipayId

Extracts provider from UniPay ID (returns undefined if invalid).

```typescript
function getProviderFromUnipayId(unipayId: string): PaymentProvider | undefined
```

### hasCapability

Checks if adapter supports a capability.

```typescript
function hasCapability(
  capabilities: AdapterCapabilities,
  capability: AdapterCapability
): boolean
```

### supportsCurrency

Checks if adapter supports a currency.

```typescript
function supportsCurrency(
  capabilities: AdapterCapabilities,
  currency: string
): boolean
```

---

## Types

### Money

```typescript
type Money = {
  readonly amount: number    // Smallest currency unit
  readonly currency: string  // ISO-4217
}
```

### CustomerInfo

```typescript
type CustomerInfo = {
  readonly id?: string
  readonly email?: string
  readonly phone?: string
  readonly name?: string
  readonly billingAddress?: Address
}
```

### Payment

```typescript
type Payment = {
  readonly provider: PaymentProvider
  readonly providerPaymentId: string
  readonly unipayId: string
  readonly status: PaymentStatus
  readonly money: Money
  readonly amountRefunded?: number
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly capturedAt?: Date
  readonly customer?: CustomerInfo
  readonly metadata?: Record<string, string>
  readonly failureReason?: string
  readonly failureCode?: string
  readonly raw: unknown
}
```

### Refund

```typescript
type Refund = {
  readonly provider: PaymentProvider
  readonly providerRefundId: string
  readonly providerPaymentId: string
  readonly unipayId: string
  readonly status: RefundStatus
  readonly money: Money
  readonly createdAt: Date
  readonly reason?: string
  readonly failureReason?: string
  readonly raw: unknown
}
```

### WebhookEvent

```typescript
type WebhookEvent = {
  readonly provider: PaymentProvider
  readonly eventType: WebhookEventType
  readonly providerEventId: string
  readonly providerEventType: string
  readonly timestamp: Date
  readonly payload: WebhookPayload
  readonly raw: unknown
}
```

---

## Enums

### PaymentStatus

```typescript
enum PaymentStatus {
  CREATED = 'CREATED'
  PENDING = 'PENDING'
  REQUIRES_ACTION = 'REQUIRES_ACTION'
  PROCESSING = 'PROCESSING'
  SUCCEEDED = 'SUCCEEDED'
  FAILED = 'FAILED'
  CANCELLED = 'CANCELLED'
  EXPIRED = 'EXPIRED'
}
```

### RefundStatus

```typescript
enum RefundStatus {
  PENDING = 'PENDING'
  PROCESSING = 'PROCESSING'
  SUCCEEDED = 'SUCCEEDED'
  FAILED = 'FAILED'
}
```

### PaymentProvider

```typescript
enum PaymentProvider {
  STRIPE = 'stripe'
  RAZORPAY = 'razorpay'
  PAYU = 'payu'
  PAYPAL = 'paypal'
  PHONEPE = 'phonepe'
  CASHFREE = 'cashfree'
}
```

### CheckoutMode

```typescript
enum CheckoutMode {
  HOSTED = 'hosted'
  SDK = 'sdk'
}
```

### WebhookEventType

```typescript
enum WebhookEventType {
  PAYMENT_CREATED = 'payment.created'
  PAYMENT_PENDING = 'payment.pending'
  PAYMENT_PROCESSING = 'payment.processing'
  PAYMENT_SUCCEEDED = 'payment.succeeded'
  PAYMENT_FAILED = 'payment.failed'
  PAYMENT_CANCELLED = 'payment.cancelled'
  PAYMENT_EXPIRED = 'payment.expired'
  REFUND_CREATED = 'refund.created'
  REFUND_PROCESSING = 'refund.processing'
  REFUND_SUCCEEDED = 'refund.succeeded'
  REFUND_FAILED = 'refund.failed'
  UNKNOWN = 'unknown'
}
```

### AdapterCapability

```typescript
enum AdapterCapability {
  HOSTED_CHECKOUT = 'hosted_checkout'
  SDK_CHECKOUT = 'sdk_checkout'
  PARTIAL_REFUND = 'partial_refund'
  FULL_REFUND = 'full_refund'
  MULTIPLE_REFUNDS = 'multiple_refunds'
  WEBHOOKS = 'webhooks'
  PAYMENT_RETRIEVAL = 'payment_retrieval'
  METADATA = 'metadata'
  IDEMPOTENCY = 'idempotency'
  MULTI_CURRENCY = 'multi_currency'
  SUBSCRIPTIONS = 'subscriptions'
  UPI = 'upi'
  NET_BANKING = 'net_banking'
  WALLETS = 'wallets'
  CARDS = 'cards'
  EMI = 'emi'
}
```
