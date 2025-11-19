import { defineConfig } from 'vitest/config'

/**
 * Integration test configuration
 *
 * These tests run against real APIs with test keys.
 * Requires environment variables:
 * - STRIPE_TEST_KEY: Stripe test secret key (sk_test_...)
 * - STRIPE_WEBHOOK_SECRET: Stripe webhook secret (whsec_...)
 * - RAZORPAY_KEY_ID: Razorpay test key ID (rzp_test_...)
 * - RAZORPAY_KEY_SECRET: Razorpay test key secret
 * - RAZORPAY_WEBHOOK_SECRET: Razorpay webhook secret
 *
 * Run with: pnpm test:integration
 */
export default defineConfig({
  test: {
    projects: [
      'packages/adapters/stripe',
      'packages/adapters/razorpay',
    ],
    globals: true,
    environment: 'node',
    include: ['packages/**/src/**/*.integration.test.ts'],
    testTimeout: 30000, // Longer timeout for API calls
    hookTimeout: 30000,
    // Run serially to avoid rate limits
    sequence: {
      concurrent: false,
    },
    // Retry failed tests once (network issues)
    retry: 1,
  },
})
