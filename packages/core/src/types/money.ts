/**
 * Monetary amount in smallest currency unit
 *
 * @example
 * // 100.00 INR (in paise)
 * { amount: 10000, currency: 'INR' }
 *
 * // 10.00 USD (in cents)
 * { amount: 1000, currency: 'USD' }
 *
 * // 500 JPY (no decimal places)
 * { amount: 500, currency: 'JPY' }
 */
export type Money = {
  /** Amount in smallest unit (paise, cents, etc.) */
  readonly amount: number
  /** ISO-4217 currency code (e.g., 'INR', 'USD', 'EUR') */
  readonly currency: string
}
