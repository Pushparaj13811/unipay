/**
 * Payment status across gateways
 *
 * Normalized status that maps gateway-specific states
 * to a unified set of statuses.
 */
export enum PaymentStatus {
  /** Payment session created, awaiting user action */
  CREATED = 'CREATED',

  /** Payment is pending (awaiting async confirmation) */
  PENDING = 'PENDING',

  /** Additional authentication required (3DS, OTP, etc.) */
  REQUIRES_ACTION = 'REQUIRES_ACTION',

  /** Payment is being processed by the gateway */
  PROCESSING = 'PROCESSING',

  /** Payment completed successfully */
  SUCCEEDED = 'SUCCEEDED',

  /** Payment failed */
  FAILED = 'FAILED',

  /** Payment was cancelled by user or merchant */
  CANCELLED = 'CANCELLED',

  /** Payment session expired before completion */
  EXPIRED = 'EXPIRED'
}

/**
 * Refund status across gateways
 */
export enum RefundStatus {
  /** Refund initiated, awaiting processing */
  PENDING = 'PENDING',

  /** Refund is being processed */
  PROCESSING = 'PROCESSING',

  /** Refund completed successfully */
  SUCCEEDED = 'SUCCEEDED',

  /** Refund failed */
  FAILED = 'FAILED'
}

/**
 * Supported payment providers
 *
 * Add new providers here when implementing new adapters.
 */
export enum PaymentProvider {
  STRIPE = 'stripe',
  RAZORPAY = 'razorpay',
  PAYU = 'payu',
  PAYPAL = 'paypal',
  PHONEPE = 'phonepe',
  CASHFREE = 'cashfree'
}

/**
 * Checkout mode - how the payment UI is presented
 */
export enum CheckoutMode {
  /**
   * Hosted checkout - redirect user to gateway's payment page
   * Gateway handles the entire payment UI.
   * Result includes checkoutUrl to redirect to.
   */
  HOSTED = 'hosted',

  /**
   * SDK checkout - use gateway's frontend SDK
   * Developer embeds gateway's SDK in their frontend.
   * Result includes credentials (clientSecret, orderId, etc.)
   * for SDK initialization.
   */
  SDK = 'sdk'
}

/**
 * Normalized webhook event types
 *
 * Maps gateway-specific event names to unified types.
 * Each adapter normalizes its events to these types.
 */
export enum WebhookEventType {
  // Payment events
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_PENDING = 'payment.pending',
  PAYMENT_PROCESSING = 'payment.processing',
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELLED = 'payment.cancelled',
  PAYMENT_EXPIRED = 'payment.expired',

  // Refund events
  REFUND_CREATED = 'refund.created',
  REFUND_PROCESSING = 'refund.processing',
  REFUND_SUCCEEDED = 'refund.succeeded',
  REFUND_FAILED = 'refund.failed',

  // Unknown/unmapped event
  UNKNOWN = 'unknown'
}

/**
 * Adapter capabilities
 *
 * Adapters declare which capabilities they support.
 * Used by orchestrator for routing decisions and
 * by developers to check feature availability.
 */
export enum AdapterCapability {
  /**
   * Supports hosted checkout pages
   * Gateway provides a URL to redirect users to
   */
  HOSTED_CHECKOUT = 'hosted_checkout',

  /**
   * Supports frontend SDK integration
   * Gateway provides credentials for frontend SDK
   */
  SDK_CHECKOUT = 'sdk_checkout',

  /**
   * Supports partial refunds
   * Can refund less than the full payment amount
   */
  PARTIAL_REFUND = 'partial_refund',

  /**
   * Supports full refunds
   * Can refund the entire payment amount
   */
  FULL_REFUND = 'full_refund',

  /**
   * Supports multiple partial refunds
   * Can issue multiple refunds on a single payment
   */
  MULTIPLE_REFUNDS = 'multiple_refunds',

  /**
   * Supports webhook notifications
   * Gateway can send event notifications
   */
  WEBHOOKS = 'webhooks',

  /**
   * Supports retrieving payment details
   * Can fetch payment status and details
   */
  PAYMENT_RETRIEVAL = 'payment_retrieval',

  /**
   * Supports custom metadata
   * Can store key-value metadata with payments
   */
  METADATA = 'metadata',

  /**
   * Supports idempotency keys
   * Can prevent duplicate payments
   */
  IDEMPOTENCY = 'idempotency',

  /**
   * Supports multiple currencies
   * Can process payments in various currencies
   */
  MULTI_CURRENCY = 'multi_currency',

  /**
   * Supports subscription/recurring payments
   */
  SUBSCRIPTIONS = 'subscriptions',

  /**
   * Supports UPI payments (India-specific)
   */
  UPI = 'upi',

  /**
   * Supports net banking (India-specific)
   */
  NET_BANKING = 'net_banking',

  /**
   * Supports wallets (PayTM, PhonePe wallet, etc.)
   */
  WALLETS = 'wallets',

  /**
   * Supports card payments
   */
  CARDS = 'cards',

  /**
   * Supports EMI/installment payments
   */
  EMI = 'emi'
}
