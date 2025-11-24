import { vi, type Mock } from 'vitest'
import {
  PaymentGatewayAdapter,
  PaymentProvider,
  AdapterCapabilities,
  AdapterCapability,
  CreatePaymentInput,
  CreatePaymentResult,
  HostedCheckoutResult,
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
  createUnipayId,
} from '@unipay/core'

/**
 * Configuration for creating a mock adapter
 */
export interface MockAdapterConfig {
  provider: PaymentProvider
  supportedCurrencies?: string[]
  capabilities?: Set<AdapterCapability>
}

/**
 * Mock adapter type with proper vi.fn types
 */
export type MockAdapter = PaymentGatewayAdapter & {
  createPayment: Mock<(input: CreatePaymentInput) => Promise<CreatePaymentResult>>
  getPayment: Mock<(providerPaymentId: string) => Promise<Payment>>
  createRefund: Mock<(providerPaymentId: string, input?: CreateRefundInput) => Promise<Refund>>
  getRefund: Mock<(providerRefundId: string) => Promise<Refund>>
  listRefunds: Mock<(providerPaymentId: string) => Promise<RefundList>>
  verifyWebhookSignature: Mock<(request: WebhookRequest, config: WebhookConfig) => WebhookVerificationResult>
  parseWebhookEvent: Mock<(request: WebhookRequest) => WebhookEvent>
}

/**
 * Create a mock adapter for testing
 */
export function createMockAdapter(config: MockAdapterConfig): MockAdapter {
  const capabilities: AdapterCapabilities = {
    provider: config.provider,
    capabilities: config.capabilities ?? new Set([
      AdapterCapability.HOSTED_CHECKOUT,
      AdapterCapability.SDK_CHECKOUT,
      AdapterCapability.PARTIAL_REFUND,
      AdapterCapability.FULL_REFUND,
      AdapterCapability.WEBHOOKS,
      AdapterCapability.PAYMENT_RETRIEVAL,
      AdapterCapability.METADATA,
    ]),
    supportedCurrencies: config.supportedCurrencies ?? ['USD', 'EUR', 'GBP', 'INR'],
    limits: {
      minAmount: 100,
      maxAmount: 10000000,
    },
  }

  return {
    provider: config.provider,
    capabilities,
    createPayment: vi.fn(),
    getPayment: vi.fn(),
    createRefund: vi.fn(),
    getRefund: vi.fn(),
    listRefunds: vi.fn(),
    verifyWebhookSignature: vi.fn(),
    parseWebhookEvent: vi.fn(),
  } as MockAdapter
}

/**
 * Create a mock hosted checkout payment result
 */
export function createMockPaymentResult(
  provider: PaymentProvider,
  overrides: Partial<HostedCheckoutResult> = {}
): HostedCheckoutResult {
  const id = 'pay_' + Math.random().toString(36).substring(7)
  return {
    checkoutMode: 'hosted' as const,
    provider,
    providerPaymentId: id,
    unipayId: createUnipayId(provider, id),
    status: PaymentStatus.CREATED,
    checkoutUrl: 'https://checkout.example.com/' + id,
    metadata: {},
    raw: {},
    ...overrides,
  }
}

/**
 * Create a mock payment
 */
export function createMockPayment(
  provider: PaymentProvider,
  overrides: Partial<Payment> = {}
): Payment {
  const id = 'pay_' + Math.random().toString(36).substring(7)
  return {
    provider,
    providerPaymentId: id,
    unipayId: createUnipayId(provider, id),
    status: PaymentStatus.SUCCEEDED,
    money: { amount: 10000, currency: 'USD' },
    createdAt: new Date(),
    updatedAt: new Date(),
    raw: {},
    ...overrides,
  }
}

/**
 * Create a mock refund
 */
export function createMockRefund(
  provider: PaymentProvider,
  overrides: Partial<Refund> = {}
): Refund {
  const id = 'rfnd_' + Math.random().toString(36).substring(7)
  return {
    provider,
    providerRefundId: id,
    providerPaymentId: 'pay_' + Math.random().toString(36).substring(7),
    unipayId: createUnipayId(provider, id),
    status: RefundStatus.SUCCEEDED,
    money: { amount: 10000, currency: 'USD' },
    createdAt: new Date(),
    raw: {},
    ...overrides,
  }
}

/**
 * Create a mock webhook event
 */
export function createMockWebhookEvent(
  provider: PaymentProvider,
  overrides: Partial<WebhookEvent> = {}
): WebhookEvent {
  return {
    provider,
    eventType: WebhookEventType.PAYMENT_SUCCEEDED,
    providerEventId: 'evt_' + Math.random().toString(36).substring(7),
    providerEventType: 'payment.captured',
    timestamp: new Date(),
    payload: {
      type: 'payment',
      providerPaymentId: 'pay_' + Math.random().toString(36).substring(7),
      status: PaymentStatus.SUCCEEDED,
      money: { amount: 10000, currency: 'USD' },
    },
    raw: {},
    ...overrides,
  }
}
