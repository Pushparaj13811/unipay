# @pushparajunipay/unipay

UniPay is a unified payment gateway solution that simplifies integration with multiple payment providers. This JavaScript SDK provides a seamless way to integrate various payment gateways into your JavaScript applications.

## Table of Contents

- [Installation](#installation)
- [Supported Payment Gateways](#supported-payment-gateways)
- [Usage](#usage)
  - [Initializing a Payment Gateway](#initializing-a-payment-gateway)
  - [Processing a Payment](#processing-a-payment)
  - [Capturing a Payment](#capturing-a-payment)
  - [Checking Payment Status](#checking-payment-status)
  - [Handling Webhooks](#handling-webhooks)
- [Error Handling](#error-handling)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)

## Installation

To install the UniPay SDK, run the following command:

```bash
npm i @pushparajunipay/unipay
```

You can also use Yarn or pnpm:

```bash
yarn add @pushparajunipay/unipay
```

```bash
pnpm add @pushparajunipay/unipay
```

## Supported Payment Gateways

- Stripe
- Razorpay
- Braintree
- Cashfree
- Square
- PayU

## Usage

### Initializing a Payment Gateway

```javascript
import { PaymentGateway } from '@pushparajunipay/unipay';

const stripeGateway = PaymentGateway.initialize('stripe', {
  apiKey: 'your_stripe_api_key'
});

const razorpayGateway = PaymentGateway.initialize('razorpay', {
  apiKey: 'your_razorpay_key_id',
  apiSecret: 'your_razorpay_key_secret'
});
```

### Processing a Payment

```javascript
try {
  const paymentResult = await stripeGateway.processPayment({
    amount: 1000,
    currency: 'USD',
    description: 'Test payment',
    customerEmail: 'customer@example.com',
    customerPhone: '+1234567890'
  });
  console.log('Payment processed:', paymentResult);
} catch (error) {
  console.error('Payment processing error:', error.message);
}
```

### Capturing a Payment

```javascript
try {
  const captureResult = await stripeGateway.capturePayment('payment_intent_id');
  console.log('Payment captured:', captureResult);
} catch (error) {
  console.error('Payment capture error:', error.message);
}
```

### Checking Payment Status

```javascript
try {
  const paymentStatus = await razorpayGateway.getPaymentStatus('payment_id');
  console.log('Payment status:', paymentStatus);
} catch (error) {
  console.error('Payment status error:', error.message);
}
```

### Handling Webhooks

```javascript
app.post('/webhook/stripe', async (req, res) => {
  try {
    const event = await stripeGateway.handleWebhook({
      body: req.body,
      signature: req.headers['stripe-signature']
    });
    console.log('Webhook handled:', event);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.sendStatus(400);
  }
});
```

## Error Handling

The SDK uses a custom `UniPayError` class for error handling. All errors thrown by the SDK will be instances of this class. You can catch and handle these errors as shown in the usage examples above.

```javascript
try {
  // SDK operation
} catch (error) {
  if (error instanceof UniPayError) {
    console.error('UniPay error:', error.message);
    // Handle UniPay-specific error
  } else {
    console.error('Unexpected error:', error);
    // Handle other errors
  }
}
```

## Development

To set up the project for development:

1. Clone the repository:
   ```bash
   git clone https://github.com/Pushparaj13811/unipay.git
   ```

2. Navigate to the `js-sdk` directory:
   ```bash
   cd unipay/js-sdk
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Testing

To run tests:

```bash
npm test
```

To run tests in watch mode:

```bash
npm run test:watch
```

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to your branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request.

For more details, refer to the main README file in the root directory of the project.

---