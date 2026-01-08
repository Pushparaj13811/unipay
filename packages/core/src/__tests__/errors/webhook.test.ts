import { describe, it, expect } from 'vitest'
import {
  WebhookError,
  WebhookErrorCode,
  WebhookSignatureError,
  WebhookParsingError,
  WebhookProviderNotConfiguredError,
  WebhookTimestampExpiredError,
} from '../../errors/webhook'
import { PaymentProvider } from '../../enums'

describe('WebhookError', () => {
  describe('WebhookError base class', () => {
    it('should create error with code and message', () => {
      const error = new WebhookError(
        WebhookErrorCode.WEBHOOK_SIGNATURE_INVALID,
        'Invalid signature'
      )

      expect(error.code).toBe(WebhookErrorCode.WEBHOOK_SIGNATURE_INVALID)
      expect(error.message).toBe('Invalid signature')
      expect(error.name).toBe('WebhookError')
    })

    it('should include provider', () => {
      const error = new WebhookError(
        WebhookErrorCode.WEBHOOK_PARSING_FAILED,
        'Parse failed',
        { provider: PaymentProvider.STRIPE }
      )

      expect(error.provider).toBe(PaymentProvider.STRIPE)
    })

    it('should include cause', () => {
      const cause = new Error('JSON parse error')
      const error = new WebhookError(
        WebhookErrorCode.WEBHOOK_PARSING_FAILED,
        'Parse failed',
        { cause }
      )

      expect(error.cause).toBe(cause)
    })
  })

  describe('WebhookSignatureError', () => {
    it('should create with provider only', () => {
      const error = new WebhookSignatureError(PaymentProvider.STRIPE)

      expect(error.code).toBe(WebhookErrorCode.WEBHOOK_SIGNATURE_INVALID)
      expect(error.message).toBe('Invalid webhook signature from stripe')
      expect(error.provider).toBe(PaymentProvider.STRIPE)
      expect(error.name).toBe('WebhookSignatureError')
    })

    it('should create with provider and reason', () => {
      const error = new WebhookSignatureError(
        PaymentProvider.RAZORPAY,
        'Timestamp too old'
      )

      expect(error.message).toBe('Invalid webhook signature from razorpay: Timestamp too old')
    })

    it('should be instance of WebhookError', () => {
      const error = new WebhookSignatureError(PaymentProvider.STRIPE)

      expect(error).toBeInstanceOf(WebhookError)
    })
  })

  describe('WebhookParsingError', () => {
    it('should create with provider and reason', () => {
      const error = new WebhookParsingError(
        PaymentProvider.STRIPE,
        'Invalid JSON'
      )

      expect(error.code).toBe(WebhookErrorCode.WEBHOOK_PARSING_FAILED)
      expect(error.message).toBe('Failed to parse webhook from stripe: Invalid JSON')
      expect(error.provider).toBe(PaymentProvider.STRIPE)
      expect(error.name).toBe('WebhookParsingError')
    })

    it('should include cause', () => {
      const cause = new SyntaxError('Unexpected token')
      const error = new WebhookParsingError(
        PaymentProvider.RAZORPAY,
        'JSON syntax error',
        cause
      )

      expect(error.cause).toBe(cause)
    })
  })

  describe('WebhookProviderNotConfiguredError', () => {
    it('should create with provider', () => {
      const error = new WebhookProviderNotConfiguredError(PaymentProvider.STRIPE)

      expect(error.code).toBe(WebhookErrorCode.WEBHOOK_PROVIDER_NOT_CONFIGURED)
      expect(error.message).toBe("Webhook handler not configured for provider 'stripe'")
      expect(error.provider).toBe(PaymentProvider.STRIPE)
      expect(error.name).toBe('WebhookProviderNotConfiguredError')
    })
  })

  describe('WebhookTimestampExpiredError', () => {
    it('should create with provider, timestamp, and tolerance', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z')
      const error = new WebhookTimestampExpiredError(
        PaymentProvider.STRIPE,
        timestamp,
        300
      )

      expect(error.code).toBe(WebhookErrorCode.WEBHOOK_TIMESTAMP_EXPIRED)
      expect(error.message).toContain('Webhook timestamp from stripe is too old')
      expect(error.message).toContain('2024-01-01')
      expect(error.message).toContain('Tolerance: 300s')
      expect(error.provider).toBe(PaymentProvider.STRIPE)
      expect(error.timestamp).toBe(timestamp)
      expect(error.tolerance).toBe(300)
      expect(error.name).toBe('WebhookTimestampExpiredError')
    })

    it('should serialize to JSON with timestamp and tolerance', () => {
      const timestamp = new Date('2024-06-15T10:30:00Z')
      const error = new WebhookTimestampExpiredError(
        PaymentProvider.RAZORPAY,
        timestamp,
        600
      )

      const json = error.toJSON()

      expect(json.timestamp).toBe('2024-06-15T10:30:00.000Z')
      expect(json.toleranceSeconds).toBe(600)
      expect(json.provider).toBe(PaymentProvider.RAZORPAY)
    })
  })
})
