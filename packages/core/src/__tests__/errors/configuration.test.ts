import { describe, it, expect } from 'vitest'
import {
  ConfigurationError,
  ConfigurationErrorCode,
  InvalidProviderConfigError,
  MissingProviderError,
  DuplicateProviderError,
  InvalidResolutionStrategyError,
  MissingWebhookConfigError,
} from '../../errors/configuration'
import { PaymentProvider } from '../../enums'

describe('ConfigurationError', () => {
  describe('ConfigurationError base class', () => {
    it('should create error with code and message', () => {
      const error = new ConfigurationError(
        ConfigurationErrorCode.MISSING_PROVIDER,
        'No providers configured'
      )

      expect(error.code).toBe(ConfigurationErrorCode.MISSING_PROVIDER)
      expect(error.message).toBe('No providers configured')
      expect(error.name).toBe('ConfigurationError')
    })

    it('should include provider in options', () => {
      const error = new ConfigurationError(
        ConfigurationErrorCode.INVALID_PROVIDER_CONFIG,
        'Invalid config',
        { provider: PaymentProvider.STRIPE }
      )

      expect(error.provider).toBe(PaymentProvider.STRIPE)
    })

    it('should include cause in options', () => {
      const cause = new Error('Original error')
      const error = new ConfigurationError(
        ConfigurationErrorCode.INVALID_PROVIDER_CONFIG,
        'Invalid config',
        { cause }
      )

      expect(error.cause).toBe(cause)
    })
  })

  describe('InvalidProviderConfigError', () => {
    it('should create with provider and reason', () => {
      const error = new InvalidProviderConfigError(
        PaymentProvider.STRIPE,
        'apiKey is required'
      )

      expect(error.code).toBe(ConfigurationErrorCode.INVALID_PROVIDER_CONFIG)
      expect(error.message).toBe('Invalid configuration for stripe: apiKey is required')
      expect(error.provider).toBe(PaymentProvider.STRIPE)
      expect(error.name).toBe('InvalidProviderConfigError')
    })

    it('should include cause', () => {
      const cause = new TypeError('Expected string')
      const error = new InvalidProviderConfigError(
        PaymentProvider.RAZORPAY,
        'keyId must be string',
        cause
      )

      expect(error.cause).toBe(cause)
    })
  })

  describe('MissingProviderError', () => {
    it('should create with default message', () => {
      const error = new MissingProviderError()

      expect(error.code).toBe(ConfigurationErrorCode.MISSING_PROVIDER)
      expect(error.message).toBe('At least one adapter must be provided')
      expect(error.name).toBe('MissingProviderError')
    })

    it('should be instance of ConfigurationError', () => {
      const error = new MissingProviderError()

      expect(error).toBeInstanceOf(ConfigurationError)
    })
  })

  describe('DuplicateProviderError', () => {
    it('should create with provider', () => {
      const error = new DuplicateProviderError(PaymentProvider.STRIPE)

      expect(error.code).toBe(ConfigurationErrorCode.DUPLICATE_PROVIDER)
      expect(error.message).toBe(
        "Duplicate adapter for provider 'stripe'. Each provider can only have one adapter."
      )
      expect(error.provider).toBe(PaymentProvider.STRIPE)
      expect(error.name).toBe('DuplicateProviderError')
    })
  })

  describe('InvalidResolutionStrategyError', () => {
    it('should create with strategy name', () => {
      const error = new InvalidResolutionStrategyError('invalid-strategy')

      expect(error.code).toBe(ConfigurationErrorCode.INVALID_RESOLUTION_STRATEGY)
      expect(error.message).toContain("Invalid resolution strategy 'invalid-strategy'")
      expect(error.message).toContain('first-available')
      expect(error.message).toContain('round-robin')
      expect(error.message).toContain('by-currency')
      expect(error.message).toContain('by-amount')
      expect(error.message).toContain('custom')
      expect(error.name).toBe('InvalidResolutionStrategyError')
    })
  })

  describe('MissingWebhookConfigError', () => {
    it('should create with provider', () => {
      const error = new MissingWebhookConfigError(PaymentProvider.STRIPE)

      expect(error.code).toBe(ConfigurationErrorCode.MISSING_WEBHOOK_CONFIG)
      expect(error.message).toBe("Webhook configuration not found for provider 'stripe'")
      expect(error.provider).toBe(PaymentProvider.STRIPE)
      expect(error.name).toBe('MissingWebhookConfigError')
    })
  })
})
