import { describe, it, expect } from 'vitest'
import {
  ValidationError,
  InvalidAmountError,
  InvalidCurrencyError,
  InvalidUrlError,
  InvalidUnipayIdError,
  MissingRequiredFieldError,
  InvalidMetadataError,
  ValidationErrorCode,
} from '../../errors/validation'
import { UniPayError } from '../../errors/base'

describe('ValidationError classes', () => {
  describe('ValidationError', () => {
    it('should create error with code and message', () => {
      const error = new ValidationError(
        ValidationErrorCode.INVALID_AMOUNT,
        'Amount is negative'
      )

      expect(error.message).toBe('Amount is negative')
      expect(error.code).toBe(ValidationErrorCode.INVALID_AMOUNT)
      expect(error.name).toBe('ValidationError')
      expect(error.field).toBeUndefined()
    })

    it('should create error with field', () => {
      const error = new ValidationError(
        ValidationErrorCode.INVALID_AMOUNT,
        'Amount is negative',
        'money.amount'
      )

      expect(error.field).toBe('money.amount')
    })

    it('should extend UniPayError', () => {
      const error = new ValidationError(
        ValidationErrorCode.INVALID_AMOUNT,
        'Test'
      )
      expect(error).toBeInstanceOf(UniPayError)
    })

    it('should serialize to JSON correctly', () => {
      const error = new ValidationError(
        ValidationErrorCode.INVALID_AMOUNT,
        'Amount is negative',
        'money.amount'
      )

      const json = error.toJSON()

      expect(json).toEqual({
        name: 'ValidationError',
        code: 'INVALID_AMOUNT',
        message: 'Amount is negative',
        provider: undefined,
        cause: undefined,
        field: 'money.amount',
      })
    })
  })

  describe('InvalidAmountError', () => {
    it('should create error with amount and reason', () => {
      const error = new InvalidAmountError(-100, 'must be positive')

      expect(error.message).toBe('Invalid amount -100: must be positive')
      expect(error.code).toBe(ValidationErrorCode.INVALID_AMOUNT)
      expect(error.field).toBe('money.amount')
      expect(error.amount).toBe(-100)
    })

    it('should serialize amount in JSON', () => {
      const error = new InvalidAmountError(0, 'must be greater than zero')
      const json = error.toJSON()

      expect(json.amount).toBe(0)
    })

    it('should handle various invalid amounts', () => {
      const errors = [
        new InvalidAmountError(-100, 'negative'),
        new InvalidAmountError(0, 'zero'),
        new InvalidAmountError(999999999999, 'too large'),
        new InvalidAmountError(0.5, 'not integer'),
      ]

      for (const error of errors) {
        expect(error).toBeInstanceOf(InvalidAmountError)
        expect(error).toBeInstanceOf(ValidationError)
      }
    })
  })

  describe('InvalidCurrencyError', () => {
    it('should create error with currency', () => {
      const error = new InvalidCurrencyError('INVALID')

      expect(error.message).toBe(
        "Invalid currency code 'INVALID'. Must be ISO-4217 format."
      )
      expect(error.code).toBe(ValidationErrorCode.INVALID_CURRENCY)
      expect(error.field).toBe('money.currency')
      expect(error.currency).toBe('INVALID')
    })

    it('should serialize currency in JSON', () => {
      const error = new InvalidCurrencyError('XYZ')
      const json = error.toJSON()

      expect(json.currency).toBe('XYZ')
    })
  })

  describe('InvalidUrlError', () => {
    it('should create error with field and url', () => {
      const error = new InvalidUrlError('successUrl', 'not-a-url')

      expect(error.message).toBe("Invalid URL for successUrl: 'not-a-url'")
      expect(error.code).toBe(ValidationErrorCode.INVALID_URL)
      expect(error.field).toBe('successUrl')
      expect(error.url).toBe('not-a-url')
    })

    it('should create error with custom reason', () => {
      const error = new InvalidUrlError(
        'cancelUrl',
        'ftp://example.com',
        'must be http or https'
      )

      expect(error.message).toBe(
        'Invalid URL for cancelUrl: must be http or https'
      )
    })

    it('should serialize url in JSON', () => {
      const error = new InvalidUrlError('successUrl', 'invalid')
      const json = error.toJSON()

      expect(json.url).toBe('invalid')
    })
  })

  describe('InvalidUnipayIdError', () => {
    it('should create error with unipay ID', () => {
      const error = new InvalidUnipayIdError('invalid-format')

      expect(error.message).toBe(
        "Invalid UniPay ID format: 'invalid-format'. Expected format: 'provider:providerPaymentId'"
      )
      expect(error.code).toBe(ValidationErrorCode.INVALID_UNIPAY_ID)
      expect(error.field).toBe('unipayId')
      expect(error.unipayId).toBe('invalid-format')
    })

    it('should serialize unipayId in JSON', () => {
      const error = new InvalidUnipayIdError('bad-id')
      const json = error.toJSON()

      expect(json.unipayId).toBe('bad-id')
    })
  })

  describe('MissingRequiredFieldError', () => {
    it('should create error with field name', () => {
      const error = new MissingRequiredFieldError('customer.email')

      expect(error.message).toBe('Missing required field: customer.email')
      expect(error.code).toBe(ValidationErrorCode.MISSING_REQUIRED_FIELD)
      expect(error.field).toBe('customer.email')
    })

    it('should handle various field names', () => {
      const fields = ['successUrl', 'money.amount', 'customer', 'metadata.orderId']

      for (const field of fields) {
        const error = new MissingRequiredFieldError(field)
        expect(error.field).toBe(field)
        expect(error.message).toContain(field)
      }
    })
  })

  describe('InvalidMetadataError', () => {
    it('should create error with reason', () => {
      const error = new InvalidMetadataError('value too long')

      expect(error.message).toBe('Invalid metadata: value too long')
      expect(error.code).toBe(ValidationErrorCode.INVALID_METADATA)
      expect(error.field).toBe('metadata')
    })

    it('should handle various metadata errors', () => {
      const reasons = [
        'too many keys',
        'value exceeds 500 characters',
        'key contains invalid characters',
        'nested objects not allowed',
      ]

      for (const reason of reasons) {
        const error = new InvalidMetadataError(reason)
        expect(error.message).toContain(reason)
      }
    })
  })

  describe('Error inheritance chain', () => {
    it('all validation errors should be catchable as ValidationError', () => {
      const errors = [
        new InvalidAmountError(-100, 'negative'),
        new InvalidCurrencyError('INVALID'),
        new InvalidUrlError('successUrl', 'invalid'),
        new InvalidUnipayIdError('invalid'),
        new MissingRequiredFieldError('field'),
        new InvalidMetadataError('reason'),
      ]

      for (const error of errors) {
        expect(error).toBeInstanceOf(ValidationError)
      }
    })

    it('all validation errors should be catchable as UniPayError', () => {
      const errors = [
        new InvalidAmountError(-100, 'negative'),
        new InvalidCurrencyError('INVALID'),
        new InvalidUrlError('successUrl', 'invalid'),
        new InvalidUnipayIdError('invalid'),
        new MissingRequiredFieldError('field'),
        new InvalidMetadataError('reason'),
      ]

      for (const error of errors) {
        expect(error).toBeInstanceOf(UniPayError)
      }
    })
  })
})
