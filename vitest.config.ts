import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use projects instead of deprecated workspace file
    projects: [
      'packages/core',
      'packages/orchestrator',
      'packages/adapters/stripe',
      'packages/adapters/razorpay',
    ],
    globals: true,
    environment: 'node',
    include: ['packages/**/src/**/*.{test,spec}.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Exclude integration tests from default run
      '**/*.integration.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['packages/**/src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/__mocks__/**',
        // Index barrel exports - just re-exports
        '**/index.ts',
        '**/resolvers/index.ts',
        // Type definition files don't have executable code
        '**/interfaces/**',
        '**/types/customer.ts',
        '**/types/money.ts',
        '**/types/payment.ts',
        '**/types/refund.ts',
        '**/types/webhook.ts',
        // Types-only files
        '**/orchestrator/src/types.ts',
        // Config files
        'vitest.config.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 60,
        lines: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})
