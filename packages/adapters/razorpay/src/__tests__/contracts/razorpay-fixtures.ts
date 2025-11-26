/**
 * Razorpay API Response Fixtures
 *
 * These fixtures represent real response shapes from the Razorpay API.
 * They are used for contract testing to ensure our adapter handles
 * actual API responses correctly.
 *
 * IMPORTANT: Update these fixtures when:
 * 1. Razorpay SDK version is upgraded
 * 2. API behavior changes are observed
 * 3. New fields are needed by the adapter
 *
 * Source: Razorpay API documentation + real API responses
 * SDK Version: razorpay@2.x
 *
 * Note: We use type assertions because the SDK types are very strict
 * but real API responses may have optional fields omitted.
 */
import type { Orders } from 'razorpay/dist/types/orders'
import type { PaymentLinks } from 'razorpay/dist/types/paymentLink'
import type { Payments } from 'razorpay/dist/types/payments'
import type { Refunds } from 'razorpay/dist/types/refunds'

/**
 * Order - Created state (awaiting payment)
 */
export const ORDER_CREATED = {
  id: 'order_test_a1b2c3d4e5f6',
  entity: 'order',
  amount: 50000,
  amount_paid: 0,
  amount_due: 50000,
  currency: 'INR',
  receipt: 'rcpt_order123',
  offer_id: null,
  status: 'created',
  attempts: 0,
  notes: {
    orderId: 'internal-order-123',
    customField: 'value',
  },
  created_at: 1704067200,
  description: 'Test Order for Payment',
  token: {
    method: '',
    currency: 'INR',
    bank_account: {} as any,
    recurring_status: null,
    failure_reason: null,
  } as any,
} as Orders.RazorpayOrder

/**
 * Order - Attempted state (payment in progress)
 */
export const ORDER_ATTEMPTED = {
  ...ORDER_CREATED,
  id: 'order_test_attempted',
  status: 'attempted',
  attempts: 1,
} as Orders.RazorpayOrder

/**
 * Order - Paid state (successful payment)
 */
export const ORDER_PAID = {
  ...ORDER_CREATED,
  id: 'order_test_paid',
  amount_paid: 50000,
  amount_due: 0,
  status: 'paid',
  attempts: 1,
} as Orders.RazorpayOrder

/**
 * Payment Link - Created state
 */
export const PAYMENT_LINK_CREATED = {
  accept_partial: false,
  amount: 100000,
  amount_paid: 0,
  callback_method: 'get',
  callback_url: 'https://example.com/success',
  cancelled_at: 0,
  created_at: '1704067200',
  currency: 'INR',
  customer: {
    contact: '+919876543210',
    email: 'customer@example.com',
    name: 'Test Customer',
  },
  description: 'Test Payment',
  expire_by: 1704153600,
  expired_at: 0,
  first_min_partial_amount: 0,
  id: 'plink_test_a1b2c3d4e5f6',
  notes: {
    orderId: 'order-123',
  },
  notify: {
    email: true,
    sms: true,
  },
  payments: null,
  reference_id: 'ref_order123',
  reminder_enable: true,
  reminders: {
    status: 'pending',
  },
  short_url: 'https://rzp.io/i/abc123xyz',
  status: 'created',
  updated_at: 1704067200,
  user_id: '',
} as PaymentLinks.RazorpayPaymentLink

/**
 * Payment Link - Paid state
 */
export const PAYMENT_LINK_PAID = {
  ...PAYMENT_LINK_CREATED,
  id: 'plink_test_paid',
  amount_paid: 100000,
  status: 'paid',
  short_url: 'https://rzp.io/i/paid123',
} as PaymentLinks.RazorpayPaymentLink

/**
 * Payment Link - Expired state
 */
export const PAYMENT_LINK_EXPIRED = {
  ...PAYMENT_LINK_CREATED,
  id: 'plink_test_expired',
  status: 'expired',
  expired_at: 1704153600,
  short_url: 'https://rzp.io/i/expired123',
} as PaymentLinks.RazorpayPaymentLink

/**
 * Payment Link - Cancelled state
 */
export const PAYMENT_LINK_CANCELLED = {
  ...PAYMENT_LINK_CREATED,
  id: 'plink_test_cancelled',
  status: 'cancelled',
  cancelled_at: 1704100000,
  short_url: 'https://rzp.io/i/cancelled123',
} as PaymentLinks.RazorpayPaymentLink

/**
 * Payment - Captured state (successful)
 */
export const PAYMENT_CAPTURED = {
  id: 'pay_test_a1b2c3d4e5f6',
  entity: 'payment',
  amount: 50000,
  currency: 'INR',
  status: 'captured',
  order_id: 'order_test_paid',
  invoice_id: null,
  international: false,
  method: 'card',
  amount_refunded: 0,
  refund_status: 'null',
  captured: true,
  description: 'Test Payment',
  card_id: 'card_test123',
  card: {
    id: 'card_test123',
    entity: 'card',
    name: 'Test User',
    last4: '1234',
    network: 'Visa',
    type: 'credit',
    issuer: 'HDFC',
    international: false,
    emi: true,
    sub_type: 'customer',
    token_iin: null,
    flows: {
      recurring: false,
    },
    number: '4111111111111111',
    expiry_month: '12',
    expiry_year: '25',
    cvv: '123',
  },
  bank: '',
  wallet: null,
  vpa: null,
  email: 'customer@example.com',
  contact: '+919876543210',
  customer_id: 'cust_test123',
  notes: {
    orderId: 'internal-order-123',
  },
  fee: 1000,
  tax: 180,
  error_code: null,
  error_description: null,
  error_source: null,
  error_step: null,
  error_reason: null,
  acquirer_data: {
    bank_transaction_id: 'txn_123456',
  },
  created_at: 1704067300,
  upi: null,
  token_id: null,
  offers: {
    entity: 'collection',
    count: 0,
    items: [],
  },
} as Payments.RazorpayPayment

/**
 * Payment - Authorized state (pending capture)
 */
export const PAYMENT_AUTHORIZED = {
  ...PAYMENT_CAPTURED,
  id: 'pay_test_authorized',
  status: 'authorized',
  captured: false,
} as Payments.RazorpayPayment

/**
 * Payment - Failed state
 */
export const PAYMENT_FAILED = {
  ...PAYMENT_CAPTURED,
  id: 'pay_test_failed',
  status: 'failed',
  captured: false,
  error_code: 'BAD_REQUEST_ERROR',
  error_description: 'Your payment could not be completed due to insufficient account balance.',
  error_source: 'customer',
  error_step: 'payment_authorization',
  error_reason: 'payment_failed',
} as Payments.RazorpayPayment

/**
 * Refund - Processed state (successful)
 */
export const REFUND_PROCESSED = {
  id: 'rfnd_test_a1b2c3d4e5f6',
  entity: 'refund',
  amount: 25000,
  currency: 'INR',
  payment_id: 'pay_test_a1b2c3d4e5f6',
  notes: {
    reason: 'Customer requested refund',
  },
  receipt: null,
  acquirer_data: {
    arn: '10000000000000',
  },
  created_at: 1704153600,
  batch_id: null,
  status: 'processed',
  speed_processed: 'normal',
  speed_requested: 'optimum',
} as Refunds.RazorpayRefund

/**
 * Refund - Pending state
 */
export const REFUND_PENDING = {
  ...REFUND_PROCESSED,
  id: 'rfnd_test_pending',
  status: 'pending',
} as Refunds.RazorpayRefund

/**
 * Refund - Failed state
 */
export const REFUND_FAILED = {
  ...REFUND_PROCESSED,
  id: 'rfnd_test_failed',
  status: 'failed',
} as Refunds.RazorpayRefund

/**
 * Refund List response
 */
export const REFUND_LIST = {
  entity: 'collection',
  count: 1,
  items: [REFUND_PROCESSED],
}

/**
 * Order Payments List response
 */
export const ORDER_PAYMENTS_LIST = {
  entity: 'collection',
  count: 1,
  items: [PAYMENT_CAPTURED],
}

/**
 * Webhook Event - payment.captured
 */
export const WEBHOOK_PAYMENT_CAPTURED = {
  entity: 'event',
  account_id: 'acc_test123',
  event: 'payment.captured',
  contains: ['payment'],
  payload: {
    payment: {
      entity: PAYMENT_CAPTURED,
    },
  },
  created_at: 1704067400,
}

/**
 * Webhook Event - payment.authorized
 */
export const WEBHOOK_PAYMENT_AUTHORIZED = {
  entity: 'event',
  account_id: 'acc_test123',
  event: 'payment.authorized',
  contains: ['payment'],
  payload: {
    payment: {
      entity: PAYMENT_AUTHORIZED,
    },
  },
  created_at: 1704067350,
}

/**
 * Webhook Event - payment.failed
 */
export const WEBHOOK_PAYMENT_FAILED = {
  entity: 'event',
  account_id: 'acc_test123',
  event: 'payment.failed',
  contains: ['payment'],
  payload: {
    payment: {
      entity: PAYMENT_FAILED,
    },
  },
  created_at: 1704067400,
}

/**
 * Webhook Event - order.paid
 */
export const WEBHOOK_ORDER_PAID = {
  entity: 'event',
  account_id: 'acc_test123',
  event: 'order.paid',
  contains: ['payment', 'order'],
  payload: {
    payment: {
      entity: PAYMENT_CAPTURED,
    },
    order: {
      entity: ORDER_PAID,
    },
  },
  created_at: 1704067400,
}

/**
 * Webhook Event - refund.created
 */
export const WEBHOOK_REFUND_CREATED = {
  entity: 'event',
  account_id: 'acc_test123',
  event: 'refund.created',
  contains: ['refund', 'payment'],
  payload: {
    refund: {
      entity: REFUND_PENDING,
    },
    payment: {
      entity: PAYMENT_CAPTURED,
    },
  },
  created_at: 1704153600,
}

/**
 * Webhook Event - refund.processed
 */
export const WEBHOOK_REFUND_PROCESSED = {
  entity: 'event',
  account_id: 'acc_test123',
  event: 'refund.processed',
  contains: ['refund', 'payment'],
  payload: {
    refund: {
      entity: REFUND_PROCESSED,
    },
    payment: {
      entity: PAYMENT_CAPTURED,
    },
  },
  created_at: 1704153700,
}

/**
 * Webhook Event - refund.failed
 */
export const WEBHOOK_REFUND_FAILED = {
  entity: 'event',
  account_id: 'acc_test123',
  event: 'refund.failed',
  contains: ['refund', 'payment'],
  payload: {
    refund: {
      entity: REFUND_FAILED,
    },
    payment: {
      entity: PAYMENT_CAPTURED,
    },
  },
  created_at: 1704153700,
}

/**
 * Error response - Bad Request
 */
export const ERROR_BAD_REQUEST = {
  error: {
    code: 'BAD_REQUEST_ERROR',
    description: 'The amount must be at least INR 1.00',
    source: 'business',
    step: 'payment_initiation',
    reason: 'input_validation_failed',
    metadata: {},
  },
}

/**
 * Error response - Not Found
 */
export const ERROR_NOT_FOUND = {
  error: {
    code: 'BAD_REQUEST_ERROR',
    description: "The id provided does not exist",
    source: 'business',
    step: 'payment_initiation',
    reason: 'input_validation_failed',
    metadata: {},
  },
}

/**
 * Error response - Authentication Failed
 */
export const ERROR_AUTHENTICATION = {
  error: {
    code: 'BAD_REQUEST_ERROR',
    description: 'The api key/secret provided is invalid',
    source: 'business',
    step: 'payment_initiation',
    reason: 'authentication_failed',
    metadata: {},
  },
}
