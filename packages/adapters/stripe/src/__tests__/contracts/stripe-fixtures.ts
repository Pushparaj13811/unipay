/**
 * Stripe API Response Fixtures
 *
 * These fixtures represent real response shapes from the Stripe API.
 * They are used for contract testing to ensure our adapter handles
 * actual API responses correctly.
 *
 * IMPORTANT: Update these fixtures when:
 * 1. Stripe SDK version is upgraded
 * 2. API behavior changes are observed
 * 3. New fields are needed by the adapter
 *
 * Source: Stripe API documentation + real API responses
 * SDK Version: stripe@14.x
 */
import type Stripe from 'stripe'

/**
 * Checkout Session - Open state (awaiting payment)
 */
export const CHECKOUT_SESSION_OPEN: Stripe.Checkout.Session = {
  id: 'cs_test_a1b2c3d4e5f6',
  object: 'checkout.session',
  after_expiration: null,
  allow_promotion_codes: null,
  amount_subtotal: 10000,
  amount_total: 10000,
  automatic_tax: { enabled: false, liability: null, status: null },
  billing_address_collection: null,
  cancel_url: 'https://example.com/cancel',
  client_reference_id: null,
  client_secret: null,
  consent: null,
  consent_collection: null,
  created: 1704067200,
  currency: 'usd',
  currency_conversion: null,
  custom_fields: [],
  custom_text: {
    after_submit: null,
    shipping_address: null,
    submit: null,
    terms_of_service_acceptance: null,
  },
  customer: null,
  customer_creation: 'if_required',
  customer_details: null,
  customer_email: 'test@example.com',
  expires_at: 1704153600,
  invoice: null,
  invoice_creation: null,
  livemode: false,
  locale: null,
  metadata: { orderId: 'order-123' },
  mode: 'payment',
  payment_intent: null,
  payment_link: null,
  payment_method_collection: 'if_required',
  payment_method_configuration_details: null,
  payment_method_options: null,
  payment_method_types: ['card'],
  payment_status: 'unpaid',
  phone_number_collection: { enabled: false },
  recovered_from: null,
  redirect_on_completion: 'always',
  return_url: undefined,
  saved_payment_method_options: null,
  setup_intent: null,
  shipping_address_collection: null,
  shipping_cost: null,
  shipping_details: null,
  shipping_options: [],
  status: 'open',
  submit_type: null,
  subscription: null,
  success_url: 'https://example.com/success',
  total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
  ui_mode: 'hosted',
  url: 'https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4e5f6',
} as Stripe.Checkout.Session

/**
 * Checkout Session - Complete state (payment successful)
 */
export const CHECKOUT_SESSION_COMPLETE: Stripe.Checkout.Session = {
  ...CHECKOUT_SESSION_OPEN,
  id: 'cs_test_completed_session',
  status: 'complete',
  payment_status: 'paid',
  payment_intent: 'pi_test_completed',
  customer_details: {
    address: {
      city: 'San Francisco',
      country: 'US',
      line1: '123 Market St',
      line2: null,
      postal_code: '94103',
      state: 'CA',
    },
    email: 'test@example.com',
    name: 'Test User',
    phone: null,
    tax_exempt: 'none',
    tax_ids: [],
  },
  url: null, // URL is null after completion
} as Stripe.Checkout.Session

/**
 * Checkout Session - Expired state
 */
export const CHECKOUT_SESSION_EXPIRED: Stripe.Checkout.Session = {
  ...CHECKOUT_SESSION_OPEN,
  id: 'cs_test_expired_session',
  status: 'expired',
  payment_status: 'unpaid',
  url: null,
} as Stripe.Checkout.Session

/**
 * Payment Intent - Requires Payment Method state
 */
export const PAYMENT_INTENT_REQUIRES_PM: Stripe.PaymentIntent = {
  id: 'pi_test_a1b2c3d4',
  object: 'payment_intent',
  amount: 10000,
  amount_capturable: 0,
  amount_details: { tip: {} },
  amount_received: 0,
  application: null,
  application_fee_amount: null,
  automatic_payment_methods: { allow_redirects: 'always', enabled: true },
  canceled_at: null,
  cancellation_reason: null,
  capture_method: 'automatic',
  client_secret: 'pi_test_a1b2c3d4_secret_xyz',
  confirmation_method: 'automatic',
  created: 1704067200,
  currency: 'usd',
  customer: null,
  description: null,
  invoice: null,
  last_payment_error: null,
  latest_charge: null,
  livemode: false,
  metadata: {},
  next_action: null,
  on_behalf_of: null,
  payment_method: null,
  payment_method_configuration_details: null,
  payment_method_options: {},
  payment_method_types: ['card'],
  processing: null,
  receipt_email: null,
  review: null,
  setup_future_usage: null,
  shipping: null,
  source: null,
  statement_descriptor: null,
  statement_descriptor_suffix: null,
  status: 'requires_payment_method',
  transfer_data: null,
  transfer_group: null,
} as Stripe.PaymentIntent

/**
 * Payment Intent - Succeeded state
 */
export const PAYMENT_INTENT_SUCCEEDED: Stripe.PaymentIntent = {
  ...PAYMENT_INTENT_REQUIRES_PM,
  id: 'pi_test_succeeded',
  status: 'succeeded',
  amount_received: 10000,
  latest_charge: 'ch_test_charge',
} as Stripe.PaymentIntent

/**
 * Refund - Succeeded state
 */
export const REFUND_SUCCEEDED: Stripe.Refund = {
  id: 're_test_a1b2c3d4',
  object: 'refund',
  amount: 5000,
  balance_transaction: 'txn_test_refund',
  charge: 'ch_test_charge',
  created: 1704153600,
  currency: 'usd',
  destination_details: {
    card: {
      reference: 'ref_123',
      reference_status: 'available',
      reference_type: 'acquirer_reference_number',
      type: 'refund',
    },
    type: 'card',
  },
  metadata: {},
  payment_intent: 'pi_test_succeeded',
  reason: 'requested_by_customer',
  receipt_number: null,
  source_transfer_reversal: null,
  status: 'succeeded',
  transfer_reversal: null,
} as Stripe.Refund

/**
 * Refund - Pending state
 */
export const REFUND_PENDING: Stripe.Refund = {
  ...REFUND_SUCCEEDED,
  id: 're_test_pending',
  status: 'pending',
} as Stripe.Refund

/**
 * Refund List response
 */
export const REFUND_LIST: Stripe.ApiList<Stripe.Refund> = {
  object: 'list',
  data: [REFUND_SUCCEEDED],
  has_more: false,
  url: '/v1/refunds',
}

/**
 * Webhook Event - checkout.session.completed
 */
export const WEBHOOK_EVENT_SESSION_COMPLETED: Stripe.Event = {
  id: 'evt_test_session_completed',
  object: 'event',
  api_version: '2023-10-16',
  created: 1704067200,
  data: {
    object: CHECKOUT_SESSION_COMPLETE,
  },
  livemode: false,
  pending_webhooks: 0,
  request: { id: 'req_test', idempotency_key: null },
  type: 'checkout.session.completed',
} as Stripe.Event

/**
 * Webhook Event - payment_intent.succeeded
 */
export const WEBHOOK_EVENT_PI_SUCCEEDED: Stripe.Event = {
  id: 'evt_test_pi_succeeded',
  object: 'event',
  api_version: '2023-10-16',
  created: 1704067200,
  data: {
    object: PAYMENT_INTENT_SUCCEEDED,
  },
  livemode: false,
  pending_webhooks: 0,
  request: { id: 'req_test', idempotency_key: null },
  type: 'payment_intent.succeeded',
} as Stripe.Event

/**
 * Webhook Event - refund.created
 */
export const WEBHOOK_EVENT_REFUND_CREATED: Stripe.Event = {
  id: 'evt_test_refund_created',
  object: 'event',
  api_version: '2023-10-16',
  created: 1704153600,
  data: {
    object: REFUND_SUCCEEDED,
  },
  livemode: false,
  pending_webhooks: 0,
  request: { id: 'req_test', idempotency_key: null },
  type: 'refund.created',
} as Stripe.Event

/**
 * Error response - Card declined
 */
export const ERROR_CARD_DECLINED = {
  type: 'card_error',
  code: 'card_declined',
  decline_code: 'insufficient_funds',
  message: 'Your card has insufficient funds.',
  param: 'payment_method',
  doc_url: 'https://stripe.com/docs/error-codes/card-declined',
}

/**
 * Error response - Resource missing
 */
export const ERROR_RESOURCE_MISSING = {
  type: 'invalid_request_error',
  code: 'resource_missing',
  message: 'No such payment_intent: pi_nonexistent',
  param: 'id',
}
