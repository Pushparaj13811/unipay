import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentOrchestrator, createPaymentClient } from '../orchestrator'
import {
  PaymentProvider,
  PaymentStatus,
  WebhookEventType,
  AdapterCapability,
  CheckoutMode,
  MissingProviderError,
  DuplicateProviderError,
  InvalidResolutionStrategyError,
  NoProviderAvailableError,
  ProviderNotFoundError,
  UnsupportedCurrencyError,
  UnsupportedCheckoutModeError,
  MissingWebhookConfigError,
  WebhookSignatureError,
  createUnipayId,
} from '@uniipay/core'
import {
  createMockAdapter,
  createMockPaymentResult,
  createMockPayment,
  createMockRefund,
  createMockWebhookEvent,
} from './mock-adapter'

describe('PaymentOrchestrator', () => {
  describe('constructor', () => {
    it('should create orchestrator with single adapter', () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const client = new PaymentOrchestrator({ adapters: [adapter] })

      expect(client).toBeInstanceOf(PaymentOrchestrator)
      expect(client.isProviderAvailable(PaymentProvider.STRIPE)).toBe(true)
    })

    it('should create orchestrator with multiple adapters', () => {
      const stripeAdapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const razorpayAdapter = createMockAdapter({ provider: PaymentProvider.RAZORPAY })
      const client = new PaymentOrchestrator({
        adapters: [stripeAdapter, razorpayAdapter],
      })

      expect(client.isProviderAvailable(PaymentProvider.STRIPE)).toBe(true)
      expect(client.isProviderAvailable(PaymentProvider.RAZORPAY)).toBe(true)
    })

    it('should throw MissingProviderError with no adapters', () => {
      expect(() => new PaymentOrchestrator({ adapters: [] })).toThrow(MissingProviderError)
    })

    it('should throw DuplicateProviderError with duplicate adapters', () => {
      const adapter1 = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const adapter2 = createMockAdapter({ provider: PaymentProvider.STRIPE })

      expect(() =>
        new PaymentOrchestrator({ adapters: [adapter1, adapter2] })
      ).toThrow(DuplicateProviderError)
    })

    it('should throw InvalidResolutionStrategyError for custom strategy without resolver', () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })

      expect(
        () =>
          new PaymentOrchestrator({
            adapters: [adapter],
            resolutionStrategy: 'custom',
          })
      ).toThrow(InvalidResolutionStrategyError)
    })

    it('should throw InvalidResolutionStrategyError for by-amount without routes', () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })

      expect(
        () =>
          new PaymentOrchestrator({
            adapters: [adapter],
            resolutionStrategy: 'by-amount',
          })
      ).toThrow(InvalidResolutionStrategyError)
    })
  })

  describe('createPaymentClient factory', () => {
    it('should create client via factory function', () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const client = createPaymentClient({ adapters: [adapter] })

      expect(client.isProviderAvailable(PaymentProvider.STRIPE)).toBe(true)
    })
  })

  describe('createPayment', () => {
    it('should create payment with default provider', async () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const mockResult = createMockPaymentResult(PaymentProvider.STRIPE)
      adapter.createPayment.mockResolvedValue(mockResult)

      const client = new PaymentOrchestrator({ adapters: [adapter] })

      const result = await client.createPayment({
        money: { amount: 10000, currency: 'USD' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })

      expect(result.provider).toBe(PaymentProvider.STRIPE)
      expect(adapter.createPayment).toHaveBeenCalled()
    })

    it('should use explicit provider when specified', async () => {
      const stripeAdapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const razorpayAdapter = createMockAdapter({ provider: PaymentProvider.RAZORPAY })

      stripeAdapter.createPayment.mockResolvedValue(
        createMockPaymentResult(PaymentProvider.STRIPE)
      )
      razorpayAdapter.createPayment.mockResolvedValue(
        createMockPaymentResult(PaymentProvider.RAZORPAY)
      )

      const client = new PaymentOrchestrator({
        adapters: [stripeAdapter, razorpayAdapter],
      })

      const result = await client.createPayment(
        {
          money: { amount: 10000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
        { provider: PaymentProvider.RAZORPAY }
      )

      expect(result.provider).toBe(PaymentProvider.RAZORPAY)
      expect(razorpayAdapter.createPayment).toHaveBeenCalled()
      expect(stripeAdapter.createPayment).not.toHaveBeenCalled()
    })

    it('should throw ProviderNotFoundError for unknown explicit provider', async () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const client = new PaymentOrchestrator({ adapters: [adapter] })

      await expect(
        client.createPayment(
          {
            money: { amount: 10000, currency: 'USD' },
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
          },
          { provider: PaymentProvider.RAZORPAY }
        )
      ).rejects.toThrow(ProviderNotFoundError)
    })

    it('should throw UnsupportedCurrencyError when currency not supported', async () => {
      const adapter = createMockAdapter({
        provider: PaymentProvider.STRIPE,
        supportedCurrencies: ['USD'],
      })
      const client = new PaymentOrchestrator({ adapters: [adapter] })

      await expect(
        client.createPayment({
          money: { amount: 10000, currency: 'JPY' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow(UnsupportedCurrencyError)
    })

    it('should throw UnsupportedCheckoutModeError when hosted mode not supported', async () => {
      const adapter = createMockAdapter({
        provider: PaymentProvider.STRIPE,
        capabilities: new Set([AdapterCapability.SDK_CHECKOUT]), // No hosted checkout
      })
      const client = new PaymentOrchestrator({ adapters: [adapter] })

      await expect(
        client.createPayment({
          money: { amount: 10000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          preferredCheckoutMode: CheckoutMode.HOSTED,
        })
      ).rejects.toThrow(UnsupportedCheckoutModeError)
    })

    it('should throw UnsupportedCheckoutModeError when SDK mode not supported', async () => {
      const adapter = createMockAdapter({
        provider: PaymentProvider.STRIPE,
        capabilities: new Set([AdapterCapability.HOSTED_CHECKOUT]), // No SDK checkout
      })
      const client = new PaymentOrchestrator({ adapters: [adapter] })

      await expect(
        client.createPayment({
          money: { amount: 10000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          preferredCheckoutMode: CheckoutMode.SDK,
        })
      ).rejects.toThrow(UnsupportedCheckoutModeError)
    })
  })

  describe('resolution strategies', () => {
    describe('first-available', () => {
      it('should use default provider when specified', async () => {
        const stripeAdapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
        const razorpayAdapter = createMockAdapter({ provider: PaymentProvider.RAZORPAY })

        razorpayAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.RAZORPAY)
        )

        const client = new PaymentOrchestrator({
          adapters: [stripeAdapter, razorpayAdapter],
          defaultProvider: PaymentProvider.RAZORPAY,
          resolutionStrategy: 'first-available',
        })

        const result = await client.createPayment({
          money: { amount: 10000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })

        expect(result.provider).toBe(PaymentProvider.RAZORPAY)
      })

      it('should use first adapter when no default', async () => {
        const stripeAdapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
        const razorpayAdapter = createMockAdapter({ provider: PaymentProvider.RAZORPAY })

        stripeAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.STRIPE)
        )

        const client = new PaymentOrchestrator({
          adapters: [stripeAdapter, razorpayAdapter],
          resolutionStrategy: 'first-available',
        })

        const result = await client.createPayment({
          money: { amount: 10000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })

        expect(result.provider).toBe(PaymentProvider.STRIPE)
      })
    })

    describe('round-robin', () => {
      it('should rotate between adapters', async () => {
        const stripeAdapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
        const razorpayAdapter = createMockAdapter({ provider: PaymentProvider.RAZORPAY })

        stripeAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.STRIPE)
        )
        razorpayAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.RAZORPAY)
        )

        const client = new PaymentOrchestrator({
          adapters: [stripeAdapter, razorpayAdapter],
          resolutionStrategy: 'round-robin',
        })

        const input = {
          money: { amount: 10000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }

        const result1 = await client.createPayment(input)
        const result2 = await client.createPayment(input)
        const result3 = await client.createPayment(input)

        // Should rotate through providers
        const providers = [result1.provider, result2.provider, result3.provider]
        expect(providers).toContain(PaymentProvider.STRIPE)
        expect(providers).toContain(PaymentProvider.RAZORPAY)
      })
    })

    describe('by-currency', () => {
      it('should route based on currency support', async () => {
        const stripeAdapter = createMockAdapter({
          provider: PaymentProvider.STRIPE,
          supportedCurrencies: ['USD', 'EUR'],
        })
        const razorpayAdapter = createMockAdapter({
          provider: PaymentProvider.RAZORPAY,
          supportedCurrencies: ['INR', 'USD'],
        })

        stripeAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.STRIPE)
        )
        razorpayAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.RAZORPAY)
        )

        const client = new PaymentOrchestrator({
          adapters: [stripeAdapter, razorpayAdapter],
          resolutionStrategy: 'by-currency',
        })

        // EUR only supported by Stripe
        const eurResult = await client.createPayment({
          money: { amount: 10000, currency: 'EUR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        expect(eurResult.provider).toBe(PaymentProvider.STRIPE)

        // INR only supported by Razorpay
        const inrResult = await client.createPayment({
          money: { amount: 10000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        expect(inrResult.provider).toBe(PaymentProvider.RAZORPAY)
      })

      it('should throw NoProviderAvailableError for unsupported currency', async () => {
        const adapter = createMockAdapter({
          provider: PaymentProvider.STRIPE,
          supportedCurrencies: ['USD'],
        })

        const client = new PaymentOrchestrator({
          adapters: [adapter],
          resolutionStrategy: 'by-currency',
        })

        await expect(
          client.createPayment({
            money: { amount: 10000, currency: 'JPY' },
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
          })
        ).rejects.toThrow(NoProviderAvailableError)
      })
    })

    describe('by-amount', () => {
      it('should route based on amount', async () => {
        const stripeAdapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
        const razorpayAdapter = createMockAdapter({ provider: PaymentProvider.RAZORPAY })

        stripeAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.STRIPE)
        )
        razorpayAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.RAZORPAY)
        )

        const client = new PaymentOrchestrator({
          adapters: [stripeAdapter, razorpayAdapter],
          resolutionStrategy: 'by-amount',
          amountRoutes: [
            { currency: 'USD', maxAmount: 10000, provider: PaymentProvider.RAZORPAY },
            { currency: 'USD', maxAmount: Infinity, provider: PaymentProvider.STRIPE },
          ],
        })

        // Small amount -> Razorpay
        const smallResult = await client.createPayment({
          money: { amount: 5000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        expect(smallResult.provider).toBe(PaymentProvider.RAZORPAY)

        // Large amount -> Stripe
        const largeResult = await client.createPayment({
          money: { amount: 50000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        expect(largeResult.provider).toBe(PaymentProvider.STRIPE)
      })
    })

    describe('custom', () => {
      it('should use custom resolver function', async () => {
        const stripeAdapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
        const razorpayAdapter = createMockAdapter({ provider: PaymentProvider.RAZORPAY })

        stripeAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.STRIPE)
        )
        razorpayAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.RAZORPAY)
        )

        const client = new PaymentOrchestrator({
          adapters: [stripeAdapter, razorpayAdapter],
          resolutionStrategy: 'custom',
          customResolver: (input) => {
            // Route INR to Razorpay, everything else to Stripe
            if (input.money.currency === 'INR') {
              return PaymentProvider.RAZORPAY
            }
            return PaymentProvider.STRIPE
          },
        })

        const usdResult = await client.createPayment({
          money: { amount: 10000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        expect(usdResult.provider).toBe(PaymentProvider.STRIPE)

        const inrResult = await client.createPayment({
          money: { amount: 10000, currency: 'INR' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        expect(inrResult.provider).toBe(PaymentProvider.RAZORPAY)
      })
    })
  })

  describe('getPayment', () => {
    it('should retrieve payment by unipayId', async () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const mockPayment = createMockPayment(PaymentProvider.STRIPE, {
        providerPaymentId: 'pay_123',
      })
      adapter.getPayment.mockResolvedValue(mockPayment)

      const client = new PaymentOrchestrator({ adapters: [adapter] })

      const result = await client.getPayment('stripe:pay_123')

      expect(result.providerPaymentId).toBe('pay_123')
      expect(adapter.getPayment).toHaveBeenCalledWith('pay_123')
    })

    it('should throw ProviderNotFoundError for unknown provider in unipayId', async () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const client = new PaymentOrchestrator({ adapters: [adapter] })

      await expect(client.getPayment('razorpay:pay_123')).rejects.toThrow(ProviderNotFoundError)
    })
  })

  describe('getPaymentByProviderId', () => {
    it('should retrieve payment by provider and ID', async () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const mockPayment = createMockPayment(PaymentProvider.STRIPE)
      adapter.getPayment.mockResolvedValue(mockPayment)

      const client = new PaymentOrchestrator({ adapters: [adapter] })

      await client.getPaymentByProviderId(PaymentProvider.STRIPE, 'pay_123')

      expect(adapter.getPayment).toHaveBeenCalledWith('pay_123')
    })
  })

  describe('createRefund', () => {
    it('should create refund using unipayId', async () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const mockRefund = createMockRefund(PaymentProvider.STRIPE)
      adapter.createRefund.mockResolvedValue(mockRefund)

      const client = new PaymentOrchestrator({ adapters: [adapter] })

      const result = await client.createRefund('stripe:pay_123', { amount: 5000 })

      expect(result.provider).toBe(PaymentProvider.STRIPE)
      expect(adapter.createRefund).toHaveBeenCalledWith('pay_123', { amount: 5000 })
    })
  })

  describe('getRefund', () => {
    it('should retrieve refund by provider and ID', async () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const mockRefund = createMockRefund(PaymentProvider.STRIPE)
      adapter.getRefund.mockResolvedValue(mockRefund)

      const client = new PaymentOrchestrator({ adapters: [adapter] })

      await client.getRefund(PaymentProvider.STRIPE, 'rfnd_123')

      expect(adapter.getRefund).toHaveBeenCalledWith('rfnd_123')
    })
  })

  describe('listRefunds', () => {
    it('should list refunds using unipayId', async () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      adapter.listRefunds.mockResolvedValue({
        refunds: [createMockRefund(PaymentProvider.STRIPE)],
        hasMore: false,
      })

      const client = new PaymentOrchestrator({ adapters: [adapter] })

      const result = await client.listRefunds('stripe:pay_123')

      expect(result.refunds).toHaveLength(1)
      expect(adapter.listRefunds).toHaveBeenCalledWith('pay_123')
    })
  })

  describe('handleWebhook', () => {
    it('should verify signature and parse event', async () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const mockEvent = createMockWebhookEvent(PaymentProvider.STRIPE)

      adapter.verifyWebhookSignature.mockReturnValue({ isValid: true })
      adapter.parseWebhookEvent.mockReturnValue(mockEvent)

      const client = new PaymentOrchestrator({
        adapters: [adapter],
        webhookConfigs: [
          { provider: PaymentProvider.STRIPE, signingSecret: 'whsec_123' },
        ],
      })

      const result = await client.handleWebhook(PaymentProvider.STRIPE, {
        rawBody: '{}',
        headers: { 'stripe-signature': 'sig' },
      })

      expect(result.eventType).toBe(WebhookEventType.PAYMENT_SUCCEEDED)
      expect(adapter.verifyWebhookSignature).toHaveBeenCalled()
      expect(adapter.parseWebhookEvent).toHaveBeenCalled()
    })

    it('should throw WebhookSignatureError when signature invalid', async () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })

      adapter.verifyWebhookSignature.mockReturnValue({
        isValid: false,
        error: 'Invalid signature',
      })

      const client = new PaymentOrchestrator({
        adapters: [adapter],
        webhookConfigs: [
          { provider: PaymentProvider.STRIPE, signingSecret: 'whsec_123' },
        ],
      })

      await expect(
        client.handleWebhook(PaymentProvider.STRIPE, {
          rawBody: '{}',
          headers: {},
        })
      ).rejects.toThrow(WebhookSignatureError)
    })

    it('should throw MissingWebhookConfigError when config missing', async () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      const client = new PaymentOrchestrator({
        adapters: [adapter],
        // No webhook configs
      })

      await expect(
        client.handleWebhook(PaymentProvider.STRIPE, {
          rawBody: '{}',
          headers: {},
        })
      ).rejects.toThrow(MissingWebhookConfigError)
    })
  })

  describe('verifyWebhookSignature', () => {
    it('should verify signature without parsing', () => {
      const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
      adapter.verifyWebhookSignature.mockReturnValue({ isValid: true })

      const client = new PaymentOrchestrator({
        adapters: [adapter],
        webhookConfigs: [
          { provider: PaymentProvider.STRIPE, signingSecret: 'whsec_123' },
        ],
      })

      const result = client.verifyWebhookSignature(PaymentProvider.STRIPE, {
        rawBody: '{}',
        headers: {},
      })

      expect(result.isValid).toBe(true)
    })
  })

  describe('introspection', () => {
    describe('getProviderCapabilities', () => {
      it('should return capabilities for registered provider', () => {
        const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
        const client = new PaymentOrchestrator({ adapters: [adapter] })

        const caps = client.getProviderCapabilities(PaymentProvider.STRIPE)

        expect(caps?.provider).toBe(PaymentProvider.STRIPE)
        expect(caps?.capabilities.has(AdapterCapability.HOSTED_CHECKOUT)).toBe(true)
      })

      it('should return undefined for unregistered provider', () => {
        const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
        const client = new PaymentOrchestrator({ adapters: [adapter] })

        const caps = client.getProviderCapabilities(PaymentProvider.RAZORPAY)

        expect(caps).toBeUndefined()
      })
    })

    describe('getRegisteredProviders', () => {
      it('should return all registered providers', () => {
        const stripeAdapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
        const razorpayAdapter = createMockAdapter({ provider: PaymentProvider.RAZORPAY })

        const client = new PaymentOrchestrator({
          adapters: [stripeAdapter, razorpayAdapter],
        })

        const providers = client.getRegisteredProviders()

        expect(providers).toContain(PaymentProvider.STRIPE)
        expect(providers).toContain(PaymentProvider.RAZORPAY)
        expect(providers).toHaveLength(2)
      })
    })

    describe('isProviderAvailable', () => {
      it('should return true for registered provider', () => {
        const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
        const client = new PaymentOrchestrator({ adapters: [adapter] })

        expect(client.isProviderAvailable(PaymentProvider.STRIPE)).toBe(true)
      })

      it('should return false for unregistered provider', () => {
        const adapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
        const client = new PaymentOrchestrator({ adapters: [adapter] })

        expect(client.isProviderAvailable(PaymentProvider.RAZORPAY)).toBe(false)
      })
    })
  })

  describe('resolver edge cases', () => {
    describe('by-amount fallback', () => {
      it('should fallback to defaultProvider when no route matches', async () => {
        const stripeAdapter = createMockAdapter({ provider: PaymentProvider.STRIPE })
        const razorpayAdapter = createMockAdapter({ provider: PaymentProvider.RAZORPAY })

        stripeAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.STRIPE)
        )

        const client = new PaymentOrchestrator({
          adapters: [stripeAdapter, razorpayAdapter],
          resolutionStrategy: 'by-amount',
          defaultProvider: PaymentProvider.STRIPE,
          amountRoutes: [
            // Only EUR routes defined
            { currency: 'EUR', maxAmount: 10000, provider: PaymentProvider.RAZORPAY },
          ],
        })

        // USD not in routes, should fallback to defaultProvider
        const result = await client.createPayment({
          money: { amount: 5000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })

        expect(result.provider).toBe(PaymentProvider.STRIPE)
      })

      it('should return undefined when no route matches and no defaultProvider', async () => {
        const stripeAdapter = createMockAdapter({ provider: PaymentProvider.STRIPE })

        const client = new PaymentOrchestrator({
          adapters: [stripeAdapter],
          resolutionStrategy: 'by-amount',
          // No defaultProvider
          amountRoutes: [
            { currency: 'EUR', maxAmount: 10000, provider: PaymentProvider.RAZORPAY },
          ],
        })

        // USD not in routes and no default - should throw
        await expect(
          client.createPayment({
            money: { amount: 5000, currency: 'USD' },
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
          })
        ).rejects.toThrow(NoProviderAvailableError)
      })
    })

    describe('by-currency fallback', () => {
      it('should fallback to defaultProvider when currency not explicitly matched but provider supports it', async () => {
        // Both adapters support USD, but we'll test the fallback path
        const stripeAdapter = createMockAdapter({
          provider: PaymentProvider.STRIPE,
          supportedCurrencies: ['USD', 'EUR'], // Supports USD
        })
        const razorpayAdapter = createMockAdapter({
          provider: PaymentProvider.RAZORPAY,
          supportedCurrencies: ['INR'], // Only INR
        })

        stripeAdapter.createPayment.mockResolvedValue(
          createMockPaymentResult(PaymentProvider.STRIPE)
        )

        const client = new PaymentOrchestrator({
          adapters: [razorpayAdapter, stripeAdapter], // Razorpay first
          resolutionStrategy: 'by-currency',
          defaultProvider: PaymentProvider.STRIPE,
        })

        // USD is supported by Stripe but not Razorpay
        // by-currency resolver should find Stripe
        const result = await client.createPayment({
          money: { amount: 5000, currency: 'USD' },
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })

        expect(result.provider).toBe(PaymentProvider.STRIPE)
      })

      it('should throw when no adapter supports the currency', async () => {
        const stripeAdapter = createMockAdapter({
          provider: PaymentProvider.STRIPE,
          supportedCurrencies: ['EUR', 'GBP'], // No USD
        })

        const client = new PaymentOrchestrator({
          adapters: [stripeAdapter],
          resolutionStrategy: 'by-currency',
          defaultProvider: PaymentProvider.STRIPE,
        })

        // USD not supported by any adapter
        await expect(
          client.createPayment({
            money: { amount: 5000, currency: 'USD' },
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
          })
        ).rejects.toThrow(UnsupportedCurrencyError)
      })
    })

    describe('round-robin with empty adapters', () => {
      it('should throw NoProviderAvailableError with empty adapters', async () => {
        expect(() => new PaymentOrchestrator({ adapters: [] })).toThrow(MissingProviderError)
      })
    })
  })
})
