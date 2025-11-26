import { vi } from 'vitest'

/**
 * Mock type for Razorpay SDK instance
 */
export type MockRazorpay = {
  orders: {
    create: ReturnType<typeof vi.fn>
    fetch: ReturnType<typeof vi.fn>
    fetchPayments: ReturnType<typeof vi.fn>
  }
  paymentLink: {
    create: ReturnType<typeof vi.fn>
    fetch: ReturnType<typeof vi.fn>
  }
  payments: {
    fetch: ReturnType<typeof vi.fn>
    refund: ReturnType<typeof vi.fn>
    fetchMultipleRefund: ReturnType<typeof vi.fn>
  }
  refunds: {
    fetch: ReturnType<typeof vi.fn>
  }
}

/**
 * Create a mock Razorpay instance
 * Use this in tests to get a type-safe mock
 */
export function createMockRazorpay(): MockRazorpay {
  return {
    orders: {
      create: vi.fn(),
      fetch: vi.fn(),
      fetchPayments: vi.fn(),
    },
    paymentLink: {
      create: vi.fn(),
      fetch: vi.fn(),
    },
    payments: {
      fetch: vi.fn(),
      refund: vi.fn(),
      fetchMultipleRefund: vi.fn(),
    },
    refunds: {
      fetch: vi.fn(),
    },
  }
}
