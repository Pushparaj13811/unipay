import { vi } from 'vitest'
import type Stripe from 'stripe'

/**
 * Create a mock Stripe instance with all commonly used methods
 */
export function createMockStripe() {
  return {
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
      retrieve: vi.fn(),
      list: vi.fn(),
    },
    webhooks: {
      signature: {
        verifyHeader: vi.fn(),
      },
      constructEvent: vi.fn(),
    },
  }
}

export type MockStripe = ReturnType<typeof createMockStripe>

/**
 * Create a type-safe mock that can be used as a Stripe instance
 */
export function asMockStripe(mock: MockStripe): unknown {
  return mock
}
