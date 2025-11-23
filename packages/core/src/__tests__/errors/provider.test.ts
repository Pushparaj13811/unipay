import { describe, it, expect } from 'vitest'
import {
  ProviderResolutionError,
  ProviderErrorCode,
  NoProviderAvailableError,
  ProviderNotFoundError,
  UnsupportedCapabilityError,
  UnsupportedCurrencyError,
  UnsupportedCheckoutModeError,
} from '../../errors/provider'
import { PaymentProvider, AdapterCapability, CheckoutMode } from '../../enums'

describe('ProviderError', () => {
  describe('ProviderResolutionError base class', () => {
    it('should create error with code and message', () => {
      const error = new ProviderResolutionError(
        ProviderErrorCode.NO_PROVIDER_AVAILABLE,
        'No provider available'
      )

      expect(error.code).toBe(ProviderErrorCode.NO_PROVIDER_AVAILABLE)
      expect(error.message).toBe('No provider available')
      expect(error.name).toBe('ProviderResolutionError')
    })

    it('should include provider in options', () => {
      const error = new ProviderResolutionError(
        ProviderErrorCode.PROVIDER_NOT_FOUND,
        'Provider not found',
        { provider: PaymentProvider.STRIPE }
      )

      expect(error.provider).toBe(PaymentProvider.STRIPE)
    })

    it('should include cause in options', () => {
      const cause = new Error('Original error')
      const error = new ProviderResolutionError(
        ProviderErrorCode.NO_PROVIDER_AVAILABLE,
        'No provider',
        { cause }
      )

      expect(error.cause).toBe(cause)
    })
  })

  describe('NoProviderAvailableError', () => {
    it('should create with default message', () => {
      const error = new NoProviderAvailableError()

      expect(error.code).toBe(ProviderErrorCode.NO_PROVIDER_AVAILABLE)
      expect(error.message).toBe('No payment provider available for this request')
      expect(error.name).toBe('NoProviderAvailableError')
    })

    it('should create with custom reason', () => {
      const error = new NoProviderAvailableError('No adapter supports JPY currency')

      expect(error.message).toBe('No adapter supports JPY currency')
    })

    it('should be instance of ProviderResolutionError', () => {
      const error = new NoProviderAvailableError()

      expect(error).toBeInstanceOf(ProviderResolutionError)
    })
  })

  describe('ProviderNotFoundError', () => {
    it('should create with provider', () => {
      const error = new ProviderNotFoundError(PaymentProvider.RAZORPAY)

      expect(error.code).toBe(ProviderErrorCode.PROVIDER_NOT_FOUND)
      expect(error.message).toBe("Provider 'razorpay' is not registered")
      expect(error.provider).toBe(PaymentProvider.RAZORPAY)
      expect(error.name).toBe('ProviderNotFoundError')
    })
  })

  describe('UnsupportedCapabilityError', () => {
    it('should create with provider and capability', () => {
      const error = new UnsupportedCapabilityError(
        PaymentProvider.STRIPE,
        AdapterCapability.UPI
      )

      expect(error.code).toBe(ProviderErrorCode.UNSUPPORTED_CAPABILITY)
      expect(error.message).toBe("Provider 'stripe' does not support 'upi'")
      expect(error.provider).toBe(PaymentProvider.STRIPE)
      expect(error.capability).toBe(AdapterCapability.UPI)
      expect(error.name).toBe('UnsupportedCapabilityError')
    })
  })

  describe('UnsupportedCurrencyError', () => {
    it('should create with provider and currency', () => {
      const error = new UnsupportedCurrencyError(PaymentProvider.RAZORPAY, 'JPY')

      expect(error.code).toBe(ProviderErrorCode.UNSUPPORTED_CURRENCY)
      expect(error.message).toBe("Provider 'razorpay' does not support currency 'JPY'")
      expect(error.provider).toBe(PaymentProvider.RAZORPAY)
      expect(error.currency).toBe('JPY')
      expect(error.name).toBe('UnsupportedCurrencyError')
    })
  })

  describe('UnsupportedCheckoutModeError', () => {
    it('should create with provider and checkout mode', () => {
      const error = new UnsupportedCheckoutModeError(
        PaymentProvider.STRIPE,
        CheckoutMode.SDK
      )

      expect(error.code).toBe(ProviderErrorCode.UNSUPPORTED_CHECKOUT_MODE)
      expect(error.message).toBe("Provider 'stripe' does not support checkout mode 'sdk'")
      expect(error.provider).toBe(PaymentProvider.STRIPE)
      expect(error.checkoutMode).toBe(CheckoutMode.SDK)
      expect(error.name).toBe('UnsupportedCheckoutModeError')
    })

    it('should work with hosted checkout mode', () => {
      const error = new UnsupportedCheckoutModeError(
        PaymentProvider.RAZORPAY,
        CheckoutMode.HOSTED
      )

      expect(error.checkoutMode).toBe(CheckoutMode.HOSTED)
      expect(error.message).toContain('hosted')
    })
  })
})
