import { describe, it, expect } from 'vitest'
import {
  RefundError,
  RefundErrorCode,
  RefundCreationError,
  RefundNotFoundError,
  RefundRetrievalError,
  PartialRefundNotSupportedError,
  RefundExceedsPaymentError,
  PaymentNotRefundableError,
  RefundAlreadyProcessedError,
} from '../../errors/refund'
import { PaymentProvider } from '../../enums'

describe('RefundError', () => {
  describe('RefundError base class', () => {
    it('should create error with code and message', () => {
      const error = new RefundError(
        RefundErrorCode.REFUND_CREATION_FAILED,
        'Refund failed'
      )

      expect(error.code).toBe(RefundErrorCode.REFUND_CREATION_FAILED)
      expect(error.message).toBe('Refund failed')
      expect(error.name).toBe('RefundError')
    })

    it('should include provider in error', () => {
      const error = new RefundError(
        RefundErrorCode.REFUND_CREATION_FAILED,
        'Refund failed',
        { provider: PaymentProvider.STRIPE }
      )

      expect(error.provider).toBe(PaymentProvider.STRIPE)
    })

    it('should include providerCode', () => {
      const error = new RefundError(
        RefundErrorCode.REFUND_CREATION_FAILED,
        'Refund failed',
        { providerCode: 'charge_already_refunded' }
      )

      expect(error.providerCode).toBe('charge_already_refunded')
    })

    it('should include providerRefundId', () => {
      const error = new RefundError(
        RefundErrorCode.REFUND_NOT_FOUND,
        'Not found',
        { providerRefundId: 'rfnd_123' }
      )

      expect(error.providerRefundId).toBe('rfnd_123')
    })

    it('should include providerPaymentId', () => {
      const error = new RefundError(
        RefundErrorCode.PAYMENT_NOT_REFUNDABLE,
        'Cannot refund',
        { providerPaymentId: 'pay_123' }
      )

      expect(error.providerPaymentId).toBe('pay_123')
    })

    it('should include cause', () => {
      const cause = new Error('Original error')
      const error = new RefundError(
        RefundErrorCode.REFUND_CREATION_FAILED,
        'Refund failed',
        { cause }
      )

      expect(error.cause).toBe(cause)
    })

    it('should serialize to JSON correctly', () => {
      const error = new RefundError(
        RefundErrorCode.REFUND_CREATION_FAILED,
        'Refund failed',
        {
          provider: PaymentProvider.STRIPE,
          providerCode: 'card_declined',
          providerRefundId: 'rfnd_123',
          providerPaymentId: 'pay_456',
        }
      )

      const json = error.toJSON()

      expect(json.name).toBe('RefundError')
      expect(json.message).toBe('Refund failed')
      expect(json.code).toBe(RefundErrorCode.REFUND_CREATION_FAILED)
      expect(json.provider).toBe(PaymentProvider.STRIPE)
      expect(json.providerCode).toBe('card_declined')
      expect(json.providerRefundId).toBe('rfnd_123')
      expect(json.providerPaymentId).toBe('pay_456')
    })
  })

  describe('RefundCreationError', () => {
    it('should create with message only', () => {
      const error = new RefundCreationError('Failed to create refund')

      expect(error.code).toBe(RefundErrorCode.REFUND_CREATION_FAILED)
      expect(error.message).toBe('Failed to create refund')
      expect(error.name).toBe('RefundCreationError')
    })

    it('should create with all options', () => {
      const cause = new Error('API error')
      const error = new RefundCreationError('Failed to create refund', {
        provider: PaymentProvider.RAZORPAY,
        providerCode: 'BAD_REQUEST_ERROR',
        providerPaymentId: 'pay_xyz',
        cause,
      })

      expect(error.provider).toBe(PaymentProvider.RAZORPAY)
      expect(error.providerCode).toBe('BAD_REQUEST_ERROR')
      expect(error.providerPaymentId).toBe('pay_xyz')
      expect(error.cause).toBe(cause)
    })

    it('should be instance of RefundError', () => {
      const error = new RefundCreationError('Failed')

      expect(error).toBeInstanceOf(RefundError)
    })
  })

  describe('RefundNotFoundError', () => {
    it('should create with refund ID', () => {
      const error = new RefundNotFoundError('rfnd_123')

      expect(error.code).toBe(RefundErrorCode.REFUND_NOT_FOUND)
      expect(error.message).toBe("Refund 'rfnd_123' not found")
      expect(error.providerRefundId).toBe('rfnd_123')
      expect(error.name).toBe('RefundNotFoundError')
    })

    it('should include provider', () => {
      const error = new RefundNotFoundError('rfnd_123', PaymentProvider.STRIPE)

      expect(error.provider).toBe(PaymentProvider.STRIPE)
    })
  })

  describe('RefundRetrievalError', () => {
    it('should create with refund ID and reason', () => {
      const error = new RefundRetrievalError('rfnd_123', 'Network timeout')

      expect(error.code).toBe(RefundErrorCode.REFUND_RETRIEVAL_FAILED)
      expect(error.message).toBe("Failed to retrieve refund 'rfnd_123': Network timeout")
      expect(error.providerRefundId).toBe('rfnd_123')
      expect(error.name).toBe('RefundRetrievalError')
    })

    it('should include all options', () => {
      const cause = new Error('Connection failed')
      const error = new RefundRetrievalError('rfnd_456', 'API error', {
        provider: PaymentProvider.RAZORPAY,
        providerCode: 'TIMEOUT',
        cause,
      })

      expect(error.provider).toBe(PaymentProvider.RAZORPAY)
      expect(error.providerCode).toBe('TIMEOUT')
      expect(error.cause).toBe(cause)
    })
  })

  describe('PartialRefundNotSupportedError', () => {
    it('should create with provider', () => {
      const error = new PartialRefundNotSupportedError(PaymentProvider.STRIPE)

      expect(error.code).toBe(RefundErrorCode.PARTIAL_REFUND_NOT_SUPPORTED)
      expect(error.message).toBe("Provider 'stripe' does not support partial refunds")
      expect(error.provider).toBe(PaymentProvider.STRIPE)
      expect(error.name).toBe('PartialRefundNotSupportedError')
    })
  })

  describe('RefundExceedsPaymentError', () => {
    it('should create with amounts', () => {
      const error = new RefundExceedsPaymentError(15000, 10000)

      expect(error.code).toBe(RefundErrorCode.REFUND_EXCEEDS_PAYMENT)
      expect(error.message).toBe('Refund amount 15000 exceeds available amount 10000')
      expect(error.requestedAmount).toBe(15000)
      expect(error.availableAmount).toBe(10000)
      expect(error.name).toBe('RefundExceedsPaymentError')
    })

    it('should include provider', () => {
      const error = new RefundExceedsPaymentError(15000, 10000, PaymentProvider.RAZORPAY)

      expect(error.provider).toBe(PaymentProvider.RAZORPAY)
    })

    it('should serialize to JSON with amounts', () => {
      const error = new RefundExceedsPaymentError(15000, 10000, PaymentProvider.STRIPE)

      const json = error.toJSON()

      expect(json.requestedAmount).toBe(15000)
      expect(json.availableAmount).toBe(10000)
      expect(json.provider).toBe(PaymentProvider.STRIPE)
    })
  })

  describe('PaymentNotRefundableError', () => {
    it('should create with payment ID and reason', () => {
      const error = new PaymentNotRefundableError('pay_123', 'Payment not captured')

      expect(error.code).toBe(RefundErrorCode.PAYMENT_NOT_REFUNDABLE)
      expect(error.message).toBe("Payment 'pay_123' cannot be refunded: Payment not captured")
      expect(error.providerPaymentId).toBe('pay_123')
      expect(error.name).toBe('PaymentNotRefundableError')
    })

    it('should include provider', () => {
      const error = new PaymentNotRefundableError(
        'pay_456',
        'Already refunded',
        PaymentProvider.STRIPE
      )

      expect(error.provider).toBe(PaymentProvider.STRIPE)
    })
  })

  describe('RefundAlreadyProcessedError', () => {
    it('should create with refund ID', () => {
      const error = new RefundAlreadyProcessedError('rfnd_123')

      expect(error.code).toBe(RefundErrorCode.REFUND_ALREADY_PROCESSED)
      expect(error.message).toBe("Refund 'rfnd_123' has already been processed")
      expect(error.providerRefundId).toBe('rfnd_123')
      expect(error.name).toBe('RefundAlreadyProcessedError')
    })

    it('should include provider', () => {
      const error = new RefundAlreadyProcessedError('rfnd_456', PaymentProvider.RAZORPAY)

      expect(error.provider).toBe(PaymentProvider.RAZORPAY)
    })
  })
})
