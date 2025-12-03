# Implementing Adapters

This guide explains how to create a new payment gateway adapter for UniPay.

## Overview

An adapter is a class that implements the `PaymentGatewayAdapter` interface, translating UniPay's unified API to a specific payment gateway's API.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ADAPTER ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   PaymentGatewayAdapter Interface                                       │
│   ├── provider: PaymentProvider                                         │
│   ├── capabilities: AdapterCapabilities                                 │
│   │                                                                      │
│   ├── createPayment(input) → CreatePaymentResult                        │
│   ├── getPayment(id) → Payment                                          │
│   ├── createRefund(paymentId, input) → Refund                           │
│   ├── getRefund(refundId) → Refund                                      │
│   ├── listRefunds(paymentId) → RefundList                               │
│   │                                                                      │
│   ├── verifyWebhookSignature(request, config) → VerificationResult      │
│   └── parseWebhookEvent(request) → WebhookEvent                         │
│                                                                          │
│        ▲                                                                 │
│        │ implements                                                      │
│        │                                                                 │
│   ┌────┴────────────────────────────────────────────────────────────┐   │
│   │                    YourGatewayAdapter                            │   │
│   │                                                                  │   │
│   │   • Translates UniPay types → Gateway format                    │   │
│   │   • Calls gateway API                                            │   │
│   │   • Translates response → UniPay types                          │   │
│   │   • Handles gateway-specific quirks                              │   │
│   │   • Verifies webhook signatures                                  │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

Here's a minimal adapter implementation:

```typescript
import {
  PaymentGatewayAdapter,
  PaymentProvider,
  AdapterCapabilities,
  AdapterCapability,
  CreatePaymentInput,
  CreatePaymentResult,
  Payment,
  Refund,
  RefundList,
  CreateRefundInput,
  WebhookRequest,
  WebhookConfig,
  WebhookVerificationResult,
  WebhookEvent,
  PaymentStatus,
  RefundStatus,
  WebhookEventType,
  createUnipayId
} from '@unipay/core'

export class MyGatewayAdapter implements PaymentGatewayAdapter {
  readonly provider = PaymentProvider.MY_GATEWAY

  readonly capabilities: AdapterCapabilities = {
    provider: PaymentProvider.MY_GATEWAY,
    capabilities: new Set([
      AdapterCapability.HOSTED_CHECKOUT,
      AdapterCapability.FULL_REFUND,
      AdapterCapability.WEBHOOKS
    ]),
    supportedCurrencies: ['USD', 'EUR']
  }

  private client: MyGatewayClient

  constructor(config: MyGatewayConfig) {
    this.client = new MyGatewayClient(config)
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    // Implementation
  }

  async getPayment(providerPaymentId: string): Promise<Payment> {
    // Implementation
  }

  async createRefund(
    providerPaymentId: string,
    input?: CreateRefundInput
  ): Promise<Refund> {
    // Implementation
  }

  async getRefund(providerRefundId: string): Promise<Refund> {
    // Implementation
  }

  async listRefunds(providerPaymentId: string): Promise<RefundList> {
    // Implementation
  }

  verifyWebhookSignature(
    request: WebhookRequest,
    config: WebhookConfig
  ): WebhookVerificationResult {
    // Implementation
  }

  parseWebhookEvent(request: WebhookRequest): WebhookEvent {
    // Implementation
  }
}
```

## Step-by-Step Implementation

### Step 1: Define Configuration

```typescript
// types.ts
export interface MyGatewayConfig {
  apiKey: string
  secretKey: string
  sandbox?: boolean
}
```

### Step 2: Register Provider (if new)

If adding a new gateway not in the `PaymentProvider` enum, you'll need to extend it in `@unipay/core`:

```typescript
// @unipay/core/src/enums.ts
export enum PaymentProvider {
  STRIPE = 'stripe',
  RAZORPAY = 'razorpay',
  PAYU = 'payu',
  PAYPAL = 'paypal',
  MY_GATEWAY = 'my_gateway'  // Add new provider
}
```

### Step 3: Declare Capabilities

```typescript
readonly capabilities: AdapterCapabilities = {
  provider: PaymentProvider.MY_GATEWAY,
  capabilities: new Set([
    // Checkout modes
    AdapterCapability.HOSTED_CHECKOUT,
    AdapterCapability.SDK_CHECKOUT,

    // Refund capabilities
    AdapterCapability.FULL_REFUND,
    AdapterCapability.PARTIAL_REFUND,
    AdapterCapability.MULTIPLE_REFUNDS,

    // Features
    AdapterCapability.WEBHOOKS,
    AdapterCapability.PAYMENT_RETRIEVAL,
    AdapterCapability.METADATA,
    AdapterCapability.IDEMPOTENCY,
    AdapterCapability.MULTI_CURRENCY,

    // Payment methods
    AdapterCapability.CARDS,
    AdapterCapability.UPI,
    AdapterCapability.NET_BANKING,
    AdapterCapability.WALLETS
  ]),
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR'],
  supportedPaymentMethods: ['card', 'bank_transfer'],
  limits: {
    minAmount: 100,          // Minimum in smallest unit
    maxAmount: 10000000,     // Maximum in smallest unit
    maxMetadataKeys: 50,
    maxMetadataValueLength: 500
  }
}
```

### Step 4: Implement createPayment

```typescript
async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  try {
    // 1. Transform UniPay input to gateway format
    const gatewayRequest = {
      amount: input.money.amount,
      currency: input.money.currency.toUpperCase(),
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customer?.email,
      customer_name: input.customer?.name,
      reference_id: input.orderId,
      description: input.description,
      metadata: input.metadata,
      expires_in: input.expiresInSeconds
    }

    // 2. Add idempotency key if supported
    const options: RequestOptions = {}
    if (input.idempotencyKey) {
      options.idempotencyKey = input.idempotencyKey
    }

    // 3. Call gateway API
    const response = await this.client.payments.create(gatewayRequest, options)

    // 4. Transform response to UniPay format
    return {
      checkoutMode: 'hosted',
      provider: this.provider,
      providerPaymentId: response.id,
      unipayId: createUnipayId(this.provider, response.id),
      status: this.mapStatus(response.status),
      checkoutUrl: response.checkout_url,
      expiresAt: response.expires_at ? new Date(response.expires_at) : undefined,
      metadata: input.metadata,
      raw: response
    }

  } catch (error) {
    throw new PaymentCreationError(
      this.provider,
      `Failed to create payment: ${error.message}`,
      error.code,
      error
    )
  }
}

private mapStatus(gatewayStatus: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
    'created': PaymentStatus.CREATED,
    'pending': PaymentStatus.PENDING,
    'processing': PaymentStatus.PROCESSING,
    'completed': PaymentStatus.SUCCEEDED,
    'paid': PaymentStatus.SUCCEEDED,
    'failed': PaymentStatus.FAILED,
    'cancelled': PaymentStatus.CANCELLED,
    'expired': PaymentStatus.EXPIRED
  }
  return statusMap[gatewayStatus] || PaymentStatus.PENDING
}
```

### Step 5: Implement getPayment

```typescript
async getPayment(providerPaymentId: string): Promise<Payment> {
  try {
    const response = await this.client.payments.retrieve(providerPaymentId)

    return {
      provider: this.provider,
      providerPaymentId: response.id,
      unipayId: createUnipayId(this.provider, response.id),
      status: this.mapStatus(response.status),
      money: {
        amount: response.amount,
        currency: response.currency.toLowerCase()
      },
      amountRefunded: response.amount_refunded || 0,
      createdAt: new Date(response.created_at),
      updatedAt: new Date(response.updated_at),
      capturedAt: response.captured_at ? new Date(response.captured_at) : undefined,
      customer: response.customer ? {
        email: response.customer.email,
        name: response.customer.name,
        phone: response.customer.phone
      } : undefined,
      metadata: response.metadata,
      failureReason: response.failure_reason,
      failureCode: response.failure_code,
      raw: response
    }

  } catch (error) {
    if (error.status === 404) {
      throw new PaymentNotFoundError(this.provider, providerPaymentId)
    }
    throw new PaymentRetrievalError(
      this.provider,
      `Failed to retrieve payment: ${error.message}`,
      error
    )
  }
}
```

### Step 6: Implement Refunds

```typescript
async createRefund(
  providerPaymentId: string,
  input?: CreateRefundInput
): Promise<Refund> {
  try {
    // Get original payment if needed for full refund amount
    const payment = await this.getPayment(providerPaymentId)
    const refundAmount = input?.amount ?? payment.money.amount

    // Check if partial refund is supported
    if (input?.amount && !this.capabilities.capabilities.has(AdapterCapability.PARTIAL_REFUND)) {
      throw new PartialRefundNotSupportedError(this.provider)
    }

    // Check refund doesn't exceed available
    const available = payment.money.amount - (payment.amountRefunded || 0)
    if (refundAmount > available) {
      throw new RefundExceedsPaymentError(refundAmount, available)
    }

    const response = await this.client.refunds.create({
      payment_id: providerPaymentId,
      amount: refundAmount,
      reason: input?.reason,
      reference_id: input?.refundId,
      metadata: input?.metadata
    }, {
      idempotencyKey: input?.idempotencyKey
    })

    return {
      provider: this.provider,
      providerRefundId: response.id,
      providerPaymentId: providerPaymentId,
      unipayId: createUnipayId(this.provider, response.id),
      status: this.mapRefundStatus(response.status),
      money: {
        amount: response.amount,
        currency: payment.money.currency
      },
      createdAt: new Date(response.created_at),
      reason: input?.reason,
      failureReason: response.failure_reason,
      raw: response
    }

  } catch (error) {
    if (error instanceof UniPayError) throw error

    throw new RefundCreationError(
      this.provider,
      `Refund failed: ${error.message}`,
      error.code,
      error
    )
  }
}

private mapRefundStatus(status: string): RefundStatus {
  const statusMap: Record<string, RefundStatus> = {
    'pending': RefundStatus.PENDING,
    'processing': RefundStatus.PROCESSING,
    'completed': RefundStatus.SUCCEEDED,
    'succeeded': RefundStatus.SUCCEEDED,
    'failed': RefundStatus.FAILED
  }
  return statusMap[status] || RefundStatus.PENDING
}

async getRefund(providerRefundId: string): Promise<Refund> {
  try {
    const response = await this.client.refunds.retrieve(providerRefundId)

    return {
      provider: this.provider,
      providerRefundId: response.id,
      providerPaymentId: response.payment_id,
      unipayId: createUnipayId(this.provider, response.id),
      status: this.mapRefundStatus(response.status),
      money: {
        amount: response.amount,
        currency: response.currency.toLowerCase()
      },
      createdAt: new Date(response.created_at),
      reason: response.reason,
      failureReason: response.failure_reason,
      raw: response
    }

  } catch (error) {
    if (error.status === 404) {
      throw new RefundNotFoundError(this.provider, providerRefundId)
    }
    throw error
  }
}

async listRefunds(providerPaymentId: string): Promise<RefundList> {
  const response = await this.client.refunds.list({
    payment_id: providerPaymentId
  })

  return {
    refunds: response.data.map(r => ({
      provider: this.provider,
      providerRefundId: r.id,
      providerPaymentId: providerPaymentId,
      unipayId: createUnipayId(this.provider, r.id),
      status: this.mapRefundStatus(r.status),
      money: {
        amount: r.amount,
        currency: r.currency.toLowerCase()
      },
      createdAt: new Date(r.created_at),
      reason: r.reason,
      failureReason: r.failure_reason,
      raw: r
    })),
    hasMore: response.has_more
  }
}
```

### Step 7: Implement Webhooks

```typescript
verifyWebhookSignature(
  request: WebhookRequest,
  config: WebhookConfig
): WebhookVerificationResult {
  try {
    const signature = request.headers['x-mygateway-signature'] as string
    if (!signature) {
      return { isValid: false, error: 'Missing signature header' }
    }

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', config.signingSecret)
      .update(request.rawBody)
      .digest('hex')

    // Constant-time comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )

    if (!isValid) {
      return { isValid: false, error: 'Signature mismatch' }
    }

    // Check timestamp if tolerance specified
    if (config.timestampToleranceSeconds) {
      const timestamp = request.headers['x-mygateway-timestamp'] as string
      const eventTime = parseInt(timestamp, 10) * 1000
      const now = Date.now()
      const tolerance = config.timestampToleranceSeconds * 1000

      if (Math.abs(now - eventTime) > tolerance) {
        return { isValid: false, error: 'Timestamp outside tolerance' }
      }
    }

    return { isValid: true }

  } catch (error) {
    return { isValid: false, error: error.message }
  }
}

parseWebhookEvent(request: WebhookRequest): WebhookEvent {
  try {
    const body = JSON.parse(request.rawBody)

    return {
      provider: this.provider,
      eventType: this.mapWebhookEventType(body.type),
      providerEventId: body.id,
      providerEventType: body.type,
      timestamp: new Date(body.created_at),
      payload: this.parseWebhookPayload(body),
      raw: body
    }

  } catch (error) {
    throw new WebhookParsingError(
      this.provider,
      `Failed to parse webhook: ${error.message}`
    )
  }
}

private mapWebhookEventType(type: string): WebhookEventType {
  const eventMap: Record<string, WebhookEventType> = {
    'payment.created': WebhookEventType.PAYMENT_CREATED,
    'payment.pending': WebhookEventType.PAYMENT_PENDING,
    'payment.processing': WebhookEventType.PAYMENT_PROCESSING,
    'payment.completed': WebhookEventType.PAYMENT_SUCCEEDED,
    'payment.succeeded': WebhookEventType.PAYMENT_SUCCEEDED,
    'payment.failed': WebhookEventType.PAYMENT_FAILED,
    'payment.cancelled': WebhookEventType.PAYMENT_CANCELLED,
    'payment.expired': WebhookEventType.PAYMENT_EXPIRED,
    'refund.created': WebhookEventType.REFUND_CREATED,
    'refund.processing': WebhookEventType.REFUND_PROCESSING,
    'refund.completed': WebhookEventType.REFUND_SUCCEEDED,
    'refund.succeeded': WebhookEventType.REFUND_SUCCEEDED,
    'refund.failed': WebhookEventType.REFUND_FAILED
  }
  return eventMap[type] || WebhookEventType.UNKNOWN
}

private parseWebhookPayload(body: any): WebhookPayload {
  const eventType = body.type

  // Payment events
  if (eventType.startsWith('payment.')) {
    const payment = body.data.payment
    return {
      type: 'payment',
      providerPaymentId: payment.id,
      status: this.mapStatus(payment.status),
      money: {
        amount: payment.amount,
        currency: payment.currency.toLowerCase()
      },
      metadata: payment.metadata,
      failureReason: payment.failure_reason,
      failureCode: payment.failure_code
    }
  }

  // Refund events
  if (eventType.startsWith('refund.')) {
    const refund = body.data.refund
    return {
      type: 'refund',
      providerRefundId: refund.id,
      providerPaymentId: refund.payment_id,
      status: this.mapRefundStatus(refund.status),
      money: {
        amount: refund.amount,
        currency: refund.currency.toLowerCase()
      },
      failureReason: refund.failure_reason
    }
  }

  // Unknown event
  return {
    type: 'unknown',
    data: body.data
  }
}
```

## Complete Example

Here's a complete adapter for a hypothetical "AcmePay" gateway:

```typescript
// acmepay.adapter.ts
import {
  PaymentGatewayAdapter,
  PaymentProvider,
  AdapterCapabilities,
  AdapterCapability,
  CreatePaymentInput,
  CreatePaymentResult,
  Payment,
  Refund,
  RefundList,
  CreateRefundInput,
  WebhookRequest,
  WebhookConfig,
  WebhookVerificationResult,
  WebhookEvent,
  WebhookPayload,
  PaymentStatus,
  RefundStatus,
  WebhookEventType,
  createUnipayId,
  PaymentCreationError,
  PaymentNotFoundError,
  PaymentRetrievalError,
  RefundCreationError,
  PartialRefundNotSupportedError,
  RefundExceedsPaymentError,
  WebhookParsingError,
  UniPayError
} from '@unipay/core'
import crypto from 'crypto'

export interface AcmePayConfig {
  apiKey: string
  secretKey: string
  sandbox?: boolean
}

export class AcmePayAdapter implements PaymentGatewayAdapter {
  readonly provider = PaymentProvider.ACMEPAY

  readonly capabilities: AdapterCapabilities = {
    provider: PaymentProvider.ACMEPAY,
    capabilities: new Set([
      AdapterCapability.HOSTED_CHECKOUT,
      AdapterCapability.SDK_CHECKOUT,
      AdapterCapability.FULL_REFUND,
      AdapterCapability.PARTIAL_REFUND,
      AdapterCapability.WEBHOOKS,
      AdapterCapability.PAYMENT_RETRIEVAL,
      AdapterCapability.METADATA,
      AdapterCapability.IDEMPOTENCY,
      AdapterCapability.CARDS
    ]),
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    limits: {
      minAmount: 50,
      maxAmount: 99999999
    }
  }

  private apiKey: string
  private secretKey: string
  private baseUrl: string

  constructor(config: AcmePayConfig) {
    this.apiKey = config.apiKey
    this.secretKey = config.secretKey
    this.baseUrl = config.sandbox
      ? 'https://sandbox.acmepay.com/api/v1'
      : 'https://api.acmepay.com/v1'
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    }

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const error = await response.json()
      throw {
        status: response.status,
        code: error.error?.code,
        message: error.error?.message || 'Request failed'
      }
    }

    return response.json()
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    try {
      const response = await this.request<any>('POST', '/payments', {
        amount: input.money.amount,
        currency: input.money.currency.toUpperCase(),
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        customer: input.customer ? {
          email: input.customer.email,
          name: input.customer.name,
          phone: input.customer.phone
        } : undefined,
        reference: input.orderId,
        description: input.description,
        metadata: input.metadata,
        expires_in_seconds: input.expiresInSeconds
      }, input.idempotencyKey)

      // Determine checkout mode based on response
      const hasCheckoutUrl = !!response.checkout_url
      const hasSdkData = !!response.client_secret

      if (input.preferredCheckoutMode === 'sdk' && hasSdkData) {
        return {
          checkoutMode: 'sdk',
          provider: this.provider,
          providerPaymentId: response.id,
          unipayId: createUnipayId(this.provider, response.id),
          status: this.mapPaymentStatus(response.status),
          sdkPayload: {
            provider: this.provider,
            data: {
              paymentId: response.id,
              clientSecret: response.client_secret,
              publishableKey: response.publishable_key
            }
          },
          expiresAt: response.expires_at ? new Date(response.expires_at) : undefined,
          metadata: input.metadata,
          raw: response
        }
      }

      return {
        checkoutMode: 'hosted',
        provider: this.provider,
        providerPaymentId: response.id,
        unipayId: createUnipayId(this.provider, response.id),
        status: this.mapPaymentStatus(response.status),
        checkoutUrl: response.checkout_url,
        expiresAt: response.expires_at ? new Date(response.expires_at) : undefined,
        metadata: input.metadata,
        raw: response
      }

    } catch (error) {
      throw new PaymentCreationError(
        this.provider,
        `Payment creation failed: ${error.message}`,
        error.code,
        error
      )
    }
  }

  async getPayment(providerPaymentId: string): Promise<Payment> {
    try {
      const response = await this.request<any>('GET', `/payments/${providerPaymentId}`)

      return {
        provider: this.provider,
        providerPaymentId: response.id,
        unipayId: createUnipayId(this.provider, response.id),
        status: this.mapPaymentStatus(response.status),
        money: {
          amount: response.amount,
          currency: response.currency.toLowerCase()
        },
        amountRefunded: response.amount_refunded || 0,
        createdAt: new Date(response.created_at),
        updatedAt: new Date(response.updated_at),
        capturedAt: response.captured_at ? new Date(response.captured_at) : undefined,
        customer: response.customer ? {
          email: response.customer.email,
          name: response.customer.name,
          phone: response.customer.phone
        } : undefined,
        metadata: response.metadata,
        failureReason: response.failure_reason,
        failureCode: response.failure_code,
        raw: response
      }

    } catch (error) {
      if (error.status === 404) {
        throw new PaymentNotFoundError(this.provider, providerPaymentId)
      }
      throw new PaymentRetrievalError(
        this.provider,
        `Failed to retrieve payment: ${error.message}`,
        error
      )
    }
  }

  async createRefund(
    providerPaymentId: string,
    input?: CreateRefundInput
  ): Promise<Refund> {
    try {
      const payment = await this.getPayment(providerPaymentId)
      const refundAmount = input?.amount ?? payment.money.amount - (payment.amountRefunded || 0)

      const response = await this.request<any>('POST', '/refunds', {
        payment_id: providerPaymentId,
        amount: refundAmount,
        reason: input?.reason,
        reference: input?.refundId,
        metadata: input?.metadata
      }, input?.idempotencyKey)

      return {
        provider: this.provider,
        providerRefundId: response.id,
        providerPaymentId: providerPaymentId,
        unipayId: createUnipayId(this.provider, response.id),
        status: this.mapRefundStatus(response.status),
        money: {
          amount: response.amount,
          currency: payment.money.currency
        },
        createdAt: new Date(response.created_at),
        reason: input?.reason,
        failureReason: response.failure_reason,
        raw: response
      }

    } catch (error) {
      if (error instanceof UniPayError) throw error

      throw new RefundCreationError(
        this.provider,
        `Refund failed: ${error.message}`,
        error.code,
        error
      )
    }
  }

  async getRefund(providerRefundId: string): Promise<Refund> {
    const response = await this.request<any>('GET', `/refunds/${providerRefundId}`)

    return {
      provider: this.provider,
      providerRefundId: response.id,
      providerPaymentId: response.payment_id,
      unipayId: createUnipayId(this.provider, response.id),
      status: this.mapRefundStatus(response.status),
      money: {
        amount: response.amount,
        currency: response.currency.toLowerCase()
      },
      createdAt: new Date(response.created_at),
      reason: response.reason,
      failureReason: response.failure_reason,
      raw: response
    }
  }

  async listRefunds(providerPaymentId: string): Promise<RefundList> {
    const response = await this.request<any>('GET', `/payments/${providerPaymentId}/refunds`)

    return {
      refunds: response.data.map((r: any) => ({
        provider: this.provider,
        providerRefundId: r.id,
        providerPaymentId: providerPaymentId,
        unipayId: createUnipayId(this.provider, r.id),
        status: this.mapRefundStatus(r.status),
        money: {
          amount: r.amount,
          currency: r.currency.toLowerCase()
        },
        createdAt: new Date(r.created_at),
        reason: r.reason,
        failureReason: r.failure_reason,
        raw: r
      })),
      hasMore: response.has_more
    }
  }

  verifyWebhookSignature(
    request: WebhookRequest,
    config: WebhookConfig
  ): WebhookVerificationResult {
    const signature = request.headers['x-acmepay-signature'] as string
    if (!signature) {
      return { isValid: false, error: 'Missing signature header' }
    }

    const timestamp = request.headers['x-acmepay-timestamp'] as string
    const payload = `${timestamp}.${request.rawBody}`

    const expected = crypto
      .createHmac('sha256', config.signingSecret)
      .update(payload)
      .digest('hex')

    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      )

      if (!isValid) {
        return { isValid: false, error: 'Invalid signature' }
      }

      if (config.timestampToleranceSeconds) {
        const eventTime = parseInt(timestamp, 10) * 1000
        const tolerance = config.timestampToleranceSeconds * 1000
        if (Math.abs(Date.now() - eventTime) > tolerance) {
          return { isValid: false, error: 'Timestamp too old' }
        }
      }

      return { isValid: true }
    } catch {
      return { isValid: false, error: 'Signature verification failed' }
    }
  }

  parseWebhookEvent(request: WebhookRequest): WebhookEvent {
    try {
      const body = JSON.parse(request.rawBody)

      return {
        provider: this.provider,
        eventType: this.mapWebhookEventType(body.type),
        providerEventId: body.id,
        providerEventType: body.type,
        timestamp: new Date(body.created),
        payload: this.parseWebhookPayload(body),
        raw: body
      }
    } catch (error) {
      throw new WebhookParsingError(
        this.provider,
        `Failed to parse webhook: ${error.message}`
      )
    }
  }

  private mapPaymentStatus(status: string): PaymentStatus {
    const map: Record<string, PaymentStatus> = {
      'pending': PaymentStatus.PENDING,
      'processing': PaymentStatus.PROCESSING,
      'succeeded': PaymentStatus.SUCCEEDED,
      'failed': PaymentStatus.FAILED,
      'canceled': PaymentStatus.CANCELLED,
      'expired': PaymentStatus.EXPIRED
    }
    return map[status] || PaymentStatus.PENDING
  }

  private mapRefundStatus(status: string): RefundStatus {
    const map: Record<string, RefundStatus> = {
      'pending': RefundStatus.PENDING,
      'processing': RefundStatus.PROCESSING,
      'succeeded': RefundStatus.SUCCEEDED,
      'failed': RefundStatus.FAILED
    }
    return map[status] || RefundStatus.PENDING
  }

  private mapWebhookEventType(type: string): WebhookEventType {
    const map: Record<string, WebhookEventType> = {
      'payment.succeeded': WebhookEventType.PAYMENT_SUCCEEDED,
      'payment.failed': WebhookEventType.PAYMENT_FAILED,
      'payment.expired': WebhookEventType.PAYMENT_EXPIRED,
      'refund.succeeded': WebhookEventType.REFUND_SUCCEEDED,
      'refund.failed': WebhookEventType.REFUND_FAILED
    }
    return map[type] || WebhookEventType.UNKNOWN
  }

  private parseWebhookPayload(body: any): WebhookPayload {
    if (body.type.startsWith('payment.')) {
      const p = body.data.object
      return {
        type: 'payment',
        providerPaymentId: p.id,
        status: this.mapPaymentStatus(p.status),
        money: { amount: p.amount, currency: p.currency.toLowerCase() },
        metadata: p.metadata,
        failureReason: p.failure_reason,
        failureCode: p.failure_code
      }
    }

    if (body.type.startsWith('refund.')) {
      const r = body.data.object
      return {
        type: 'refund',
        providerRefundId: r.id,
        providerPaymentId: r.payment_id,
        status: this.mapRefundStatus(r.status),
        money: { amount: r.amount, currency: r.currency.toLowerCase() },
        failureReason: r.failure_reason
      }
    }

    return { type: 'unknown', data: body.data }
  }
}
```

## Best Practices

### 1. Always Use Constant-Time Comparison for Signatures

```typescript
// Good
crypto.timingSafeEqual(Buffer.from(sig1), Buffer.from(sig2))

// Bad - vulnerable to timing attacks
sig1 === sig2
```

### 2. Wrap Gateway Errors

```typescript
try {
  await this.client.payments.create(...)
} catch (error) {
  throw new PaymentCreationError(
    this.provider,
    error.message,
    error.code,  // Preserve provider's error code
    error        // Keep original as cause
  )
}
```

### 3. Include Raw Response

Always include the raw gateway response for debugging:

```typescript
return {
  ...normalizedData,
  raw: gatewayResponse  // Original response
}
```

### 4. Document Capability Limitations

```typescript
readonly capabilities: AdapterCapabilities = {
  // Document what's NOT supported
  capabilities: new Set([
    AdapterCapability.FULL_REFUND
    // Note: PARTIAL_REFUND not included - gateway doesn't support it
  ])
}
```

### 5. Test Thoroughly

Create tests for:
- Payment creation (success and failure)
- Payment retrieval
- Refund creation (full and partial)
- Webhook signature verification
- Webhook event parsing
- Error handling

```typescript
describe('AcmePayAdapter', () => {
  it('should create payment successfully', async () => {
    const result = await adapter.createPayment({
      money: { amount: 1000, currency: 'USD' },
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    })

    expect(result.provider).toBe(PaymentProvider.ACMEPAY)
    expect(result.checkoutUrl).toBeDefined()
  })

  it('should verify valid webhook signature', () => {
    const result = adapter.verifyWebhookSignature(validRequest, config)
    expect(result.isValid).toBe(true)
  })

  it('should reject invalid webhook signature', () => {
    const result = adapter.verifyWebhookSignature(invalidRequest, config)
    expect(result.isValid).toBe(false)
  })
})
```

## Publishing Your Adapter

1. Create a package: `@unipay/adapter-mygateway`
2. Export the adapter class and config type
3. Document supported features and limitations
4. Publish to npm

```typescript
// index.ts
export { MyGatewayAdapter } from './mygateway.adapter'
export type { MyGatewayConfig } from './types'
```
