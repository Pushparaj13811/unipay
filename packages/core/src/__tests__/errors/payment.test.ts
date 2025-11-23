import { describe, it, expect } from 'vitest'
import {
  PaymentError,
  PaymentCreationError,
  PaymentNotFoundError,
  PaymentRetrievalError,
  PaymentAlreadyCapturedError,
  PaymentExpiredError,
  PaymentCancelledError,
  PaymentErrorCode,
} from '../../errors/payment'
import { UniPayError } from '../../errors/base'
import { PaymentProvider } from '../../enums'

describe('PaymentError classes', () => {
  describe('PaymentCreationError', () => {
    it('should create error with message only', () => {
      const error = new PaymentCreationError('Card declined')

      expect(error.message).toBe('Card declined')
      expect(error.code).toBe(PaymentErrorCode.PAYMENT_CREATION_FAILED)
      expect(error.name).toBe('PaymentCreationError')
      expect(error.provider).toBeUndefined()
      expect(error.providerCode).toBeUndefined()
    })

    it('should create error with provider', () => {
      const error = new PaymentCreationError('Card declined', {
        provider: PaymentProvider.STRIPE,
      })

      expect(error.provider).toBe(PaymentProvider.STRIPE)
    })

    it('should create error with provider code', () => {
      const error = new PaymentCreationError('Card declined', {
        provider: PaymentProvider.STRIPE,
        providerCode: 'card_declined',
      })

      expect(error.providerCode).toBe('card_declined')
    })

    it('should create error with cause', () => {
      const originalError = new Error('Network error')
      const error = new PaymentCreationError('Card declined', {
        cause: originalError,
      })

      expect(error.cause).toBe(originalError)
    })

    it('should extend UniPayError', () => {
      const error = new PaymentCreationError('Test')
      expect(error).toBeInstanceOf(UniPayError)
      expect(error).toBeInstanceOf(PaymentError)
    })

    it('should serialize to JSON correctly', () => {
      const error = new PaymentCreationError('Card declined', {
        provider: PaymentProvider.STRIPE,
        providerCode: 'card_declined',
      })

      const json = error.toJSON()

      expect(json).toEqual({
        name: 'PaymentCreationError',
        code: 'PAYMENT_CREATION_FAILED',
        message: 'Card declined',
        provider: 'stripe',
        cause: undefined,
        providerCode: 'card_declined',
        providerPaymentId: undefined,
      })
    })
  })

  describe('PaymentNotFoundError', () => {
    it('should create error with payment ID', () => {
      const error = new PaymentNotFoundError('pay_123')

      expect(error.message).toBe("Payment 'pay_123' not found")
      expect(error.code).toBe(PaymentErrorCode.PAYMENT_NOT_FOUND)
      expect(error.providerPaymentId).toBe('pay_123')
    })

    it('should create error with payment ID and provider', () => {
      const error = new PaymentNotFoundError('pay_123', PaymentProvider.STRIPE)

      expect(error.provider).toBe(PaymentProvider.STRIPE)
      expect(error.providerPaymentId).toBe('pay_123')
    })
  })

  describe('PaymentRetrievalError', () => {
    it('should create error with payment ID and reason', () => {
      const error = new PaymentRetrievalError('pay_123', 'Network timeout')

      expect(error.message).toBe(
        "Failed to retrieve payment 'pay_123': Network timeout"
      )
      expect(error.code).toBe(PaymentErrorCode.PAYMENT_RETRIEVAL_FAILED)
      expect(error.providerPaymentId).toBe('pay_123')
    })

    it('should create error with all options', () => {
      const cause = new Error('Connection refused')
      const error = new PaymentRetrievalError('pay_123', 'Network timeout', {
        provider: PaymentProvider.RAZORPAY,
        providerCode: 'TIMEOUT',
        cause,
      })

      expect(error.provider).toBe(PaymentProvider.RAZORPAY)
      expect(error.providerCode).toBe('TIMEOUT')
      expect(error.cause).toBe(cause)
    })
  })

  describe('PaymentAlreadyCapturedError', () => {
    it('should create error with payment ID', () => {
      const error = new PaymentAlreadyCapturedError('pay_123')

      expect(error.message).toBe("Payment 'pay_123' has already been captured")
      expect(error.code).toBe(PaymentErrorCode.PAYMENT_ALREADY_CAPTURED)
      expect(error.providerPaymentId).toBe('pay_123')
    })

    it('should create error with payment ID and provider', () => {
      const error = new PaymentAlreadyCapturedError(
        'pay_123',
        PaymentProvider.STRIPE
      )

      expect(error.provider).toBe(PaymentProvider.STRIPE)
    })
  })

  describe('PaymentExpiredError', () => {
    it('should create error with payment ID', () => {
      const error = new PaymentExpiredError('pay_123')

      expect(error.message).toBe("Payment 'pay_123' has expired")
      expect(error.code).toBe(PaymentErrorCode.PAYMENT_EXPIRED)
      expect(error.providerPaymentId).toBe('pay_123')
    })

    it('should create error with payment ID and provider', () => {
      const error = new PaymentExpiredError('pay_123', PaymentProvider.RAZORPAY)

      expect(error.provider).toBe(PaymentProvider.RAZORPAY)
    })
  })

  describe('PaymentCancelledError', () => {
    it('should create error with payment ID', () => {
      const error = new PaymentCancelledError('pay_123')

      expect(error.message).toBe("Payment 'pay_123' was cancelled")
      expect(error.code).toBe(PaymentErrorCode.PAYMENT_CANCELLED)
      expect(error.providerPaymentId).toBe('pay_123')
    })

    it('should create error with payment ID and provider', () => {
      const error = new PaymentCancelledError('pay_123', PaymentProvider.STRIPE)

      expect(error.provider).toBe(PaymentProvider.STRIPE)
    })
  })

  describe('Error inheritance chain', () => {
    it('all payment errors should be catchable as PaymentError', () => {
      const errors = [
        new PaymentCreationError('test'),
        new PaymentNotFoundError('test'),
        new PaymentRetrievalError('test', 'reason'),
        new PaymentAlreadyCapturedError('test'),
        new PaymentExpiredError('test'),
        new PaymentCancelledError('test'),
      ]

      for (const error of errors) {
        expect(error).toBeInstanceOf(PaymentError)
      }
    })

    it('all payment errors should be catchable as UniPayError', () => {
      const errors = [
        new PaymentCreationError('test'),
        new PaymentNotFoundError('test'),
        new PaymentRetrievalError('test', 'reason'),
        new PaymentAlreadyCapturedError('test'),
        new PaymentExpiredError('test'),
        new PaymentCancelledError('test'),
      ]

      for (const error of errors) {
        expect(error).toBeInstanceOf(UniPayError)
      }
    })

    it('all payment errors should be catchable as Error', () => {
      const errors = [
        new PaymentCreationError('test'),
        new PaymentNotFoundError('test'),
        new PaymentRetrievalError('test', 'reason'),
        new PaymentAlreadyCapturedError('test'),
        new PaymentExpiredError('test'),
        new PaymentCancelledError('test'),
      ]

      for (const error of errors) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })
})
