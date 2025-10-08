/**
 * Billing/shipping address
 */
export type Address = {
  readonly line1?: string
  readonly line2?: string
  readonly city?: string
  readonly state?: string
  readonly postalCode?: string
  /** ISO-3166-1 alpha-2 country code (e.g., 'IN', 'US') */
  readonly country?: string
}

/**
 * Customer information for payment context
 *
 * @example
 * {
 *   id: 'cust_123',
 *   email: 'customer@example.com',
 *   phone: '+919876543210',
 *   name: 'John Doe'
 * }
 */
export type CustomerInfo = {
  /** Your system's customer ID */
  readonly id?: string
  /** Customer email - often required by gateways */
  readonly email?: string
  /** Customer phone - required by Indian gateways (Razorpay, PayU) */
  readonly phone?: string
  /** Customer full name */
  readonly name?: string
  /** Billing address */
  readonly billingAddress?: Address
}
