import { describe, it, expect } from 'vitest'
import {
  createUnipayId,
  parseUnipayId,
  isValidUnipayId,
  getProviderFromUnipayId,
} from '../../utils/unipay-id'
import { PaymentProvider } from '../../enums'
import { InvalidUnipayIdError } from '../../errors'

describe('unipay-id utilities', () => {
  describe('createUnipayId', () => {
    it('should create valid ID for Stripe provider', () => {
      const result = createUnipayId(PaymentProvider.STRIPE, 'cs_test_abc123')
      expect(result).toBe('stripe:cs_test_abc123')
    })

    it('should create valid ID for Razorpay provider', () => {
      const result = createUnipayId(PaymentProvider.RAZORPAY, 'order_ABC123')
      expect(result).toBe('razorpay:order_ABC123')
    })

    it('should create valid ID for PayU provider', () => {
      const result = createUnipayId(PaymentProvider.PAYU, 'txn_123')
      expect(result).toBe('payu:txn_123')
    })

    it('should create valid ID for PayPal provider', () => {
      const result = createUnipayId(PaymentProvider.PAYPAL, 'PAY-1AB23456CD')
      expect(result).toBe('paypal:PAY-1AB23456CD')
    })

    it('should create valid ID for PhonePe provider', () => {
      const result = createUnipayId(PaymentProvider.PHONEPE, 'pay_123')
      expect(result).toBe('phonepe:pay_123')
    })

    it('should create valid ID for Cashfree provider', () => {
      const result = createUnipayId(PaymentProvider.CASHFREE, 'order_123')
      expect(result).toBe('cashfree:order_123')
    })

    it('should throw error if providerPaymentId is empty string', () => {
      expect(() => createUnipayId(PaymentProvider.STRIPE, '')).toThrow(
        'providerPaymentId cannot be empty'
      )
    })

    it('should throw error if providerPaymentId is whitespace only', () => {
      expect(() => createUnipayId(PaymentProvider.STRIPE, '   ')).toThrow(
        'providerPaymentId cannot be empty'
      )
    })

    it('should handle payment IDs with special characters', () => {
      const result = createUnipayId(PaymentProvider.STRIPE, 'cs_test_a1b2c3:d4e5f6')
      expect(result).toBe('stripe:cs_test_a1b2c3:d4e5f6')
    })

    it('should handle payment IDs with unicode characters', () => {
      const result = createUnipayId(PaymentProvider.RAZORPAY, 'order_测试123')
      expect(result).toBe('razorpay:order_测试123')
    })
  })

  describe('parseUnipayId', () => {
    it('should parse valid Stripe UniPay ID', () => {
      const result = parseUnipayId('stripe:cs_test_abc123')
      expect(result).toEqual({
        provider: PaymentProvider.STRIPE,
        providerPaymentId: 'cs_test_abc123',
      })
    })

    it('should parse valid Razorpay UniPay ID', () => {
      const result = parseUnipayId('razorpay:order_ABC123')
      expect(result).toEqual({
        provider: PaymentProvider.RAZORPAY,
        providerPaymentId: 'order_ABC123',
      })
    })

    it('should parse valid PayU UniPay ID', () => {
      const result = parseUnipayId('payu:txn_123')
      expect(result).toEqual({
        provider: PaymentProvider.PAYU,
        providerPaymentId: 'txn_123',
      })
    })

    it('should handle payment IDs containing colons', () => {
      const result = parseUnipayId('stripe:cs_test:with:colons')
      expect(result).toEqual({
        provider: PaymentProvider.STRIPE,
        providerPaymentId: 'cs_test:with:colons',
      })
    })

    it('should throw InvalidUnipayIdError for empty string', () => {
      expect(() => parseUnipayId('')).toThrow(InvalidUnipayIdError)
    })

    it('should throw InvalidUnipayIdError for string without separator', () => {
      expect(() => parseUnipayId('invalid')).toThrow(InvalidUnipayIdError)
    })

    it('should throw InvalidUnipayIdError for unknown provider', () => {
      expect(() => parseUnipayId('unknown:id123')).toThrow(InvalidUnipayIdError)
    })

    it('should throw InvalidUnipayIdError for empty payment ID after separator', () => {
      expect(() => parseUnipayId('stripe:')).toThrow(InvalidUnipayIdError)
    })

    it('should throw InvalidUnipayIdError for whitespace-only payment ID', () => {
      expect(() => parseUnipayId('stripe:   ')).toThrow(InvalidUnipayIdError)
    })

    it('should throw InvalidUnipayIdError for null value', () => {
      expect(() => parseUnipayId(null as unknown as string)).toThrow(
        InvalidUnipayIdError
      )
    })

    it('should throw InvalidUnipayIdError for undefined value', () => {
      expect(() => parseUnipayId(undefined as unknown as string)).toThrow(
        InvalidUnipayIdError
      )
    })

    it('should include the invalid ID in error message', () => {
      try {
        parseUnipayId('invalid-format')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidUnipayIdError)
        expect((error as InvalidUnipayIdError).message).toContain('invalid-format')
      }
    })
  })

  describe('isValidUnipayId', () => {
    it('should return true for valid Stripe ID', () => {
      expect(isValidUnipayId('stripe:cs_test_abc123')).toBe(true)
    })

    it('should return true for valid Razorpay ID', () => {
      expect(isValidUnipayId('razorpay:order_ABC123')).toBe(true)
    })

    it('should return true for valid PayU ID', () => {
      expect(isValidUnipayId('payu:txn_123')).toBe(true)
    })

    it('should return true for valid PayPal ID', () => {
      expect(isValidUnipayId('paypal:PAY-123')).toBe(true)
    })

    it('should return false for empty string', () => {
      expect(isValidUnipayId('')).toBe(false)
    })

    it('should return false for string without separator', () => {
      expect(isValidUnipayId('invalid')).toBe(false)
    })

    it('should return false for unknown provider', () => {
      expect(isValidUnipayId('unknown:id123')).toBe(false)
    })

    it('should return false for empty payment ID', () => {
      expect(isValidUnipayId('stripe:')).toBe(false)
    })

    it('should not throw for any input', () => {
      expect(() => isValidUnipayId('')).not.toThrow()
      expect(() => isValidUnipayId('invalid')).not.toThrow()
      expect(() => isValidUnipayId(null as unknown as string)).not.toThrow()
    })
  })

  describe('getProviderFromUnipayId', () => {
    it('should extract Stripe provider', () => {
      expect(getProviderFromUnipayId('stripe:cs_test_abc123')).toBe(
        PaymentProvider.STRIPE
      )
    })

    it('should extract Razorpay provider', () => {
      expect(getProviderFromUnipayId('razorpay:order_ABC123')).toBe(
        PaymentProvider.RAZORPAY
      )
    })

    it('should extract PayU provider', () => {
      expect(getProviderFromUnipayId('payu:txn_123')).toBe(PaymentProvider.PAYU)
    })

    it('should return undefined for empty string', () => {
      expect(getProviderFromUnipayId('')).toBeUndefined()
    })

    it('should return undefined for string without separator', () => {
      expect(getProviderFromUnipayId('invalid')).toBeUndefined()
    })

    it('should return undefined for unknown provider', () => {
      expect(getProviderFromUnipayId('unknown:id123')).toBeUndefined()
    })

    it('should return undefined for null value', () => {
      expect(getProviderFromUnipayId(null as unknown as string)).toBeUndefined()
    })

    it('should return undefined for undefined value', () => {
      expect(
        getProviderFromUnipayId(undefined as unknown as string)
      ).toBeUndefined()
    })

    it('should not throw for any input', () => {
      expect(() => getProviderFromUnipayId('')).not.toThrow()
      expect(() => getProviderFromUnipayId('invalid')).not.toThrow()
      expect(() => getProviderFromUnipayId(null as unknown as string)).not.toThrow()
    })
  })

  describe('roundtrip', () => {
    it('should parse back to same values after create', () => {
      const providers = [
        PaymentProvider.STRIPE,
        PaymentProvider.RAZORPAY,
        PaymentProvider.PAYU,
        PaymentProvider.PAYPAL,
        PaymentProvider.PHONEPE,
        PaymentProvider.CASHFREE,
      ]

      for (const provider of providers) {
        const paymentId = `test_${provider}_123`
        const unipayId = createUnipayId(provider, paymentId)
        const parsed = parseUnipayId(unipayId)

        expect(parsed.provider).toBe(provider)
        expect(parsed.providerPaymentId).toBe(paymentId)
      }
    })
  })
})
