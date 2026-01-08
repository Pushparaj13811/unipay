# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-01-08

### 🎉 Initial Release

This is the first public release of UniPay - a unified payment gateway abstraction layer for Node.js applications.

### ✨ Features

#### Core Package (@uniipay/core)

- **Payment Gateway Abstraction**: Unified interface for multiple payment providers
- **Comprehensive Type System**: Full TypeScript support with strict typing
- **Error Hierarchy**: Structured error handling with specific error types:
  - `ConfigurationError` - Configuration and setup issues
  - `PaymentError` - Payment processing failures
  - `ValidationError` - Input validation errors
  - `NetworkError` - Network and connectivity issues
  - `WebhookError` - Webhook processing errors
- **UniPay ID System**: Unified payment identifiers across providers
- **Payment Interfaces**:
  - Checkout sessions (hosted and embedded)
  - Payment intents
  - Refunds
  - Webhook handling
- **Checkout Modes**: Support for hosted, embedded, and SDK-based checkouts
- **Currency Support**: Multi-currency payment processing

#### Orchestrator Package (@uniipay/orchestrator)

- **Multi-Gateway Orchestration**: Manage multiple payment providers simultaneously
- **Intelligent Routing Strategies**:
  - **First Available**: Use the first configured provider
  - **Round Robin**: Distribute load evenly across providers
  - **By Currency**: Route based on payment currency
  - **By Amount**: Route based on transaction amount
  - **Custom Resolvers**: Build your own routing logic
- **Automatic Failover**: Seamless fallback to backup providers
- **Provider Health Tracking**: Monitor provider availability
- **Unified API**: Single interface for all payment operations
- **Type-Safe Configuration**: Strongly typed orchestrator setup

#### Stripe Adapter (@uniipay/adapter-stripe)

- **Stripe SDK Integration**: Built on official Stripe Node.js SDK v14.x
- **Checkout Sessions**:
  - Hosted checkout pages
  - Embedded checkout
  - Customizable success/cancel URLs
- **Payment Intents**: Direct payment processing
- **Refund Support**: Full and partial refunds
- **Webhook Handling**:
  - Signature verification
  - Event type mapping to UniPay events
  - Secure webhook processing
- **Customer Management**: Optional customer ID support
- **Metadata Support**: Custom metadata for payments
- **Comprehensive Testing**: 358 tests covering all functionality

#### Razorpay Adapter (@uniipay/adapter-razorpay)

- **Razorpay SDK Integration**: Built on official Razorpay Node.js SDK v2.9.x
- **Order Creation**: Razorpay Orders API integration
- **Payment Links**: Generate payment links for customers
- **Multiple Payment Methods**:
  - Cards (Credit/Debit)
  - UPI
  - Net Banking
  - Wallets
- **Refund Support**: Full and partial refunds with speed control
- **Webhook Handling**:
  - Signature verification
  - Event type mapping
  - Secure webhook processing
- **Indian Payment Support**: Optimized for Indian payment ecosystem
- **Comprehensive Testing**: Full test coverage including integration tests

### 📦 Package Structure

```
@uniipay/core               - Core types and interfaces
@uniipay/orchestrator       - Multi-gateway orchestration
@uniipay/adapter-stripe     - Stripe payment adapter
@uniipay/adapter-razorpay   - Razorpay payment adapter
```

### 🛠️ Development Tools

- **TypeScript Support**: Full TypeScript with declaration files
- **Vitest Testing**: Comprehensive test suite with 358+ tests
- **Test Coverage**:
  - Unit tests for all components
  - Integration tests with real APIs
  - Contract tests for SDK compatibility
  - Webhook signature verification tests
- **pnpm Workspaces**: Monorepo structure with workspace management
- **GitHub Actions CI/CD**:
  - Automated testing on Node.js 18.x, 20.x, 22.x
  - Type checking
  - Security audits
  - Automated NPM publishing

### 📚 Documentation

- **Getting Started Guide**: Quick setup and basic usage
- **API Reference**: Complete API documentation
- **Configuration Guide**: Detailed configuration options
- **Multi-Gateway Setup**: Guide for orchestrator usage
- **Routing Strategies**: Documentation for all routing options
- **Error Handling**: Error types and handling patterns
- **Webhook Integration**: Webhook setup and verification
- **Checkout Modes**: Guide for different checkout implementations
- **Publishing Guide**: Step-by-step NPM publishing instructions
- **CI/CD Setup**: Complete CI/CD configuration guide
- **Contributing Guidelines**: Guide for implementing new adapters

### 🔒 Security

- **Webhook Signature Verification**: Secure webhook processing for both Stripe and Razorpay
- **API Key Protection**: Secure credential management
- **Input Validation**: Comprehensive validation for all inputs
- **Error Sanitization**: Safe error messages without exposing sensitive data
- **Dependency Auditing**: Automated security audits in CI/CD

### 🧪 Testing

- **358+ Tests**: Comprehensive test coverage
- **Test Types**:
  - Unit tests for business logic
  - Integration tests with real payment APIs
  - Contract tests for SDK compatibility
  - Webhook tests with signature verification
- **Test Fixtures**: Realistic test data based on actual API responses
- **Mock Adapters**: Testing utilities for orchestrator

### 📋 Requirements

- **Node.js**: >= 18.x
- **TypeScript**: >= 5.3.x (optional, but recommended)
- **pnpm**: 10.27.0 (for development)

### 📄 License

MIT License

### 🙏 Acknowledgments

- Stripe for their excellent payment infrastructure
- Razorpay for their comprehensive Indian payment solutions
- The open-source community for inspiration and tools

### 📖 Getting Started

```bash
# Install packages
npm install @uniipay/core @uniipay/adapter-stripe

# Or with orchestrator for multi-gateway support
npm install @uniipay/orchestrator @uniipay/adapter-stripe @uniipay/adapter-razorpay
```

**Single Gateway Example:**

```typescript
import { createPaymentClient, PaymentProvider } from '@uniipay/orchestrator'
import { StripeAdapter } from '@uniipay/adapter-stripe'

const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: process.env.STRIPE_SECRET_KEY })
  ],
  webhookConfigs: [
    { provider: PaymentProvider.STRIPE, signingSecret: process.env.STRIPE_WEBHOOK_SECRET }
  ]
})

const result = await client.createPayment({
  money: { amount: 5000, currency: 'USD' },
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel'
})

console.log(result.checkoutUrl)
```

**Multi-Gateway Example:**

```typescript
import { createPaymentClient, PaymentProvider } from '@uniipay/orchestrator'
import { StripeAdapter } from '@uniipay/adapter-stripe'
import { RazorpayAdapter } from '@uniipay/adapter-razorpay'

const client = createPaymentClient({
  adapters: [
    new StripeAdapter({ apiKey: process.env.STRIPE_SECRET_KEY }),
    new RazorpayAdapter({
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET
    })
  ],
  resolutionStrategy: 'by-currency',
  webhookConfigs: [
    { provider: PaymentProvider.STRIPE, signingSecret: process.env.STRIPE_WEBHOOK_SECRET },
    { provider: PaymentProvider.RAZORPAY, signingSecret: process.env.RAZORPAY_WEBHOOK_SECRET }
  ]
})

const result = await client.createPayment({
  money: { amount: 10000, currency: 'INR' },
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel'
})
```

### 🔗 Links

- **GitHub Repository**: https://github.com/Pushparaj13811/unipay
- **NPM Organization**: https://www.npmjs.com/org/uniipay
- **Documentation**: https://github.com/Pushparaj13811/unipay/tree/main/docs
- **Issue Tracker**: https://github.com/Pushparaj13811/unipay/issues

### 📝 Notes

This is the initial release of UniPay. While the package is production-ready and thoroughly tested, we welcome feedback and contributions from the community. Please report any issues or feature requests on our GitHub repository.

### 🚀 What's Next?

Future releases may include:
- Additional payment gateway adapters (PayPal, Square, Braintree, etc.)
- Advanced routing strategies (geographic, cost-optimization, success-rate based)
- Payment analytics and monitoring
- Retry mechanisms with exponential backoff
- Provider health checks and circuit breakers
- Webhook event queuing and processing
- Multi-region support
- Enhanced error recovery

---

**Full Changelog**: https://github.com/Pushparaj13811/unipay/commits/v0.1.0

[Unreleased]: https://github.com/Pushparaj13811/unipay/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Pushparaj13811/unipay/releases/tag/v0.1.0
