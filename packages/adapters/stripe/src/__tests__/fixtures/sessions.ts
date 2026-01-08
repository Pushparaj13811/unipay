import type Stripe from 'stripe'

/**
 * Create a mock Stripe Checkout Session
 */
export function createMockCheckoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  const now = Math.floor(Date.now() / 1000)

  return {
    id: 'cs_test_' + Math.random().toString(36).substring(7),
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
    created: now,
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
    customer_email: null,
    expires_at: now + 3600,
    invoice: null,
    invoice_creation: null,
    livemode: false,
    locale: null,
    metadata: {},
    mode: 'payment',
    payment_intent: 'pi_test_' + Math.random().toString(36).substring(7),
    payment_link: null,
    payment_method_collection: 'if_required',
    payment_method_configuration_details: null,
    payment_method_options: null,
    payment_method_types: ['card'],
    payment_status: 'unpaid',
    phone_number_collection: { enabled: false },
    recovered_from: null,
    redirect_on_completion: 'always',
    return_url: null,
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
    total_details: null,
    ui_mode: 'hosted',
    url: 'https://checkout.stripe.com/c/pay/cs_test_abc123',
    ...overrides,
  } as Stripe.Checkout.Session
}

/**
 * Create a completed checkout session
 */
export function createCompletedCheckoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  return createMockCheckoutSession({
    status: 'complete',
    payment_status: 'paid',
    ...overrides,
  })
}

/**
 * Create an expired checkout session
 */
export function createExpiredCheckoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  const now = Math.floor(Date.now() / 1000)
  return createMockCheckoutSession({
    status: 'expired',
    payment_status: 'unpaid',
    expires_at: now - 100,
    ...overrides,
  })
}
