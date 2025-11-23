import { describe, it, expect } from 'vitest'
import { hasCapability, supportsCurrency, AdapterCapabilities } from '../../types/capability'
import { AdapterCapability, PaymentProvider } from '../../enums'

describe('capability utilities', () => {
  const createCapabilities = (
    capabilities: AdapterCapability[],
    currencies: string[] = ['USD', 'EUR', 'INR']
  ): AdapterCapabilities => ({
    provider: PaymentProvider.STRIPE,
    capabilities: new Set(capabilities),
    supportedCurrencies: currencies,
  })

  describe('hasCapability', () => {
    it('should return true when capability is present', () => {
      const capabilities = createCapabilities([
        AdapterCapability.HOSTED_CHECKOUT,
        AdapterCapability.PARTIAL_REFUND,
      ])

      expect(hasCapability(capabilities, AdapterCapability.HOSTED_CHECKOUT)).toBe(true)
      expect(hasCapability(capabilities, AdapterCapability.PARTIAL_REFUND)).toBe(true)
    })

    it('should return false when capability is absent', () => {
      const capabilities = createCapabilities([AdapterCapability.HOSTED_CHECKOUT])

      expect(hasCapability(capabilities, AdapterCapability.PARTIAL_REFUND)).toBe(false)
      expect(hasCapability(capabilities, AdapterCapability.UPI)).toBe(false)
    })

    it('should return false for empty capabilities', () => {
      const capabilities = createCapabilities([])

      expect(hasCapability(capabilities, AdapterCapability.HOSTED_CHECKOUT)).toBe(false)
    })

    it('should work with all capability types', () => {
      const allCapabilities = [
        AdapterCapability.HOSTED_CHECKOUT,
        AdapterCapability.SDK_CHECKOUT,
        AdapterCapability.PARTIAL_REFUND,
        AdapterCapability.FULL_REFUND,
        AdapterCapability.MULTIPLE_REFUNDS,
        AdapterCapability.WEBHOOKS,
        AdapterCapability.PAYMENT_RETRIEVAL,
        AdapterCapability.METADATA,
        AdapterCapability.IDEMPOTENCY,
        AdapterCapability.MULTI_CURRENCY,
        AdapterCapability.CARDS,
        AdapterCapability.UPI,
        AdapterCapability.NET_BANKING,
        AdapterCapability.WALLETS,
        AdapterCapability.EMI,
      ]

      const capabilities = createCapabilities(allCapabilities)

      for (const cap of allCapabilities) {
        expect(hasCapability(capabilities, cap)).toBe(true)
      }
    })
  })

  describe('supportsCurrency', () => {
    it('should return true for supported currency', () => {
      const capabilities = createCapabilities([], ['USD', 'EUR', 'INR'])

      expect(supportsCurrency(capabilities, 'USD')).toBe(true)
      expect(supportsCurrency(capabilities, 'EUR')).toBe(true)
      expect(supportsCurrency(capabilities, 'INR')).toBe(true)
    })

    it('should return false for unsupported currency', () => {
      const capabilities = createCapabilities([], ['USD', 'EUR'])

      expect(supportsCurrency(capabilities, 'INR')).toBe(false)
      expect(supportsCurrency(capabilities, 'GBP')).toBe(false)
    })

    it('should be case-insensitive', () => {
      const capabilities = createCapabilities([], ['USD', 'EUR', 'INR'])

      expect(supportsCurrency(capabilities, 'usd')).toBe(true)
      expect(supportsCurrency(capabilities, 'Usd')).toBe(true)
      expect(supportsCurrency(capabilities, 'USD')).toBe(true)
      expect(supportsCurrency(capabilities, 'eur')).toBe(true)
      expect(supportsCurrency(capabilities, 'inr')).toBe(true)
    })

    it('should return false for empty currencies list', () => {
      const capabilities = createCapabilities([], [])

      expect(supportsCurrency(capabilities, 'USD')).toBe(false)
    })

    it('should handle common currency codes', () => {
      const capabilities = createCapabilities([], [
        'USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD',
      ])

      expect(supportsCurrency(capabilities, 'USD')).toBe(true)
      expect(supportsCurrency(capabilities, 'EUR')).toBe(true)
      expect(supportsCurrency(capabilities, 'GBP')).toBe(true)
      expect(supportsCurrency(capabilities, 'INR')).toBe(true)
      expect(supportsCurrency(capabilities, 'JPY')).toBe(true)
      expect(supportsCurrency(capabilities, 'AUD')).toBe(true)
      expect(supportsCurrency(capabilities, 'CAD')).toBe(true)
      expect(supportsCurrency(capabilities, 'CHF')).toBe(true)
      expect(supportsCurrency(capabilities, 'CNY')).toBe(true)
      expect(supportsCurrency(capabilities, 'HKD')).toBe(true)
    })
  })
})
