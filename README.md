# uniPay

**Author:** Hompushparaj Mehta

**uniPay** is an open-source SDK that unifies multiple payment gateways into a single integration point for developers. With **uniPay**, you can seamlessly integrate various payment gateways like PayPal, Razorpay, Stripe, PhonePe, Paytm, PayU, and Easebuzz without the need to manage multiple routes or endpoints.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [JavaScript (Node.js, Bun, Deno, Hono)](#javascript-nodejs-bun-deno-hono)
- [Usage](#usage)
  - [JavaScript Example](#javascript-example)
- [Supported Gateways](#supported-gateways)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Edge Cases](#edge-cases)
- [Folder Structure](#folder-structure)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

- **Single Integration Point:** Integrate multiple payment gateways with a single endpoint.
- **Lightweight SDK:** No need to install individual payment gateway SDKs.
- **Easy Setup:** Install and configure uniPay with minimal effort.
- **Extensible Architecture:** Easily add support for more payment gateways in the future.
- **Error Handling:** Consistent error handling across different payment gateways.
- **Scalable Structure:** Designed to accommodate future expansions and additional features.

## Installation

<!-- **Note:** This package is not yet published to npm. Once published, you'll be able to install it using the following methods: -->

### JavaScript (Node.js, Bun, Deno, Hono)

To install **uniPay** in a JavaScript project, you will be able to use npm, yarn, or pnpm. Run one of the following commands in your project directory:

- ### Using npm
```
npm i @pushparajunipay/unipay
```
- ### Using yarn
```
yarn i @pushparajunipay/unipay
```
- ### Using pnpm
```
pnpm i @pushparajunipay/unipay
```

For now, you can clone the repository and install dependencies:

```bash
git clone https://github.com/Pushparaj13811/unipay.git
cd unipay/js-sdk
npm install
```

## Usage

### JavaScript Example

```javascript
import UniPay from 'unipay-js-sdk';

const unipay = new UniPay();

unipay.registerPaymentGateway('stripe', {
  apiKey: 'your_stripe_api_key'
});

unipay.registerPaymentGateway('razorpay', {
  apiKey: 'your_razorpay_key_id',
  apiSecret: 'your_razorpay_key_secret'
});

// Process a payment
try {
  const paymentResult = await unipay.initiatePayment('stripe', {
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

## Supported Gateways

- Stripe
- Razorpay
- Braintree
- Cashfree
- Square
- PayU

## Configuration

You can configure the payment gateways in the `uniPay` instance as shown in the usage examples. Each gateway requires specific credentials. Make sure to replace placeholder values with your actual credentials.

## Error Handling

**uniPay** uses a custom `UniPayError` class for consistent error handling across different payment gateways. You can catch and handle these errors in your application.

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

## Edge Cases

When integrating **uniPay**, you may encounter various edge cases that could affect payment processing. Below are common scenarios you should consider, along with suggested handling techniques and example responses.

### 1. Invalid Credentials

**Description:** This occurs when the provided payment gateway credentials are invalid or missing.

**Response Handling:**
- Check if the credentials are present and correctly formatted.
- Return a clear error message indicating the issue.

**Example Error Handling:**
```javascript
try {
    const unipay = new UniPay();
    unipay.registerPaymentGateway('stripe', {
        apiKey: 'invalid_api_key'
    });
    await unipay.initiatePayment('stripe', paymentDetails);
} catch (error) {
    if (error instanceof UniPayError) {
        console.error('Invalid Credentials:', error.message);
        // Handle invalid credentials, prompt user to check their input
    }
}
```

### 2. Insufficient Funds

**Description:** The payment fails due to insufficient funds in the payer's account.

**Response Handling:**
- Capture the error response from the payment gateway and inform the user.

**Example Error Handling:**
```javascript
try {
    const paymentResult = await unipay.initiatePayment('stripe', paymentDetails);
} catch (error) {
    if (error instanceof UniPayError && error.code === 'insufficient_funds') {
        console.error('Insufficient Funds:', error.message);
        // Inform the user about insufficient funds
    }
}
```

### 3. Network Issues

**Description:** Network-related errors occur during payment processing, which could cause requests to fail.

**Response Handling:**
- Implement a retry mechanism or prompt the user to check their internet connection.

**Example Error Handling:**
```javascript
async function initiatePaymentWithRetry(gateway, paymentDetails, retries = 3) {
    while (retries > 0) {
        try {
            return await unipay.initiatePayment(gateway, paymentDetails);
        } catch (error) {
            if (error instanceof UniPayError && error.code === 'network_error') {
                console.error('Network Error:', error.message);
                retries--;
                if (retries === 0) {
                    // Inform the user about the network issue
                    throw error;
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                throw error; // Rethrow other errors
            }
        }
    }
}
```

### 4. Currency Mismatch

**Description:** This error occurs when the specified currency in the payment details does not match the supported currencies of the selected payment gateway.

**Response Handling:**
- Validate the currency before processing the payment and return a specific error if there's a mismatch.

**Example Error Handling:**
```javascript
const validCurrencies = ['USD', 'EUR', 'GBP']; // Add your valid currencies here

if (!validCurrencies.includes(paymentDetails.currency)) {
    throw new UniPayError('Invalid currency specified.', 'currency_mismatch');
}
```

### 5. Payment Timeout

**Description:** Payment processing may hang due to unresponsive payment gateways.

**Response Handling:**
- Set a timeout for payment processing and handle timeout errors appropriately.

**Example Error Handling:**
```javascript
const initiatePaymentWithTimeout = async (gateway, paymentDetails, timeout = 10000) => {
    return Promise.race([
        unipay.initiatePayment(gateway, paymentDetails),
        new Promise((_, reject) => 
            setTimeout(() => reject(new UniPayError('Payment processing timed out', 'timeout')), timeout)
        )
    ]);
};

try {
    const result = await initiatePaymentWithTimeout('stripe', paymentDetails);
    console.log('Payment processed:', result);
} catch (error) {
    if (error instanceof UniPayError && error.code === 'timeout') {
        console.error('Payment Timeout:', error.message);
        // Handle timeout error
    }
}
```

### 6. Concurrency Issues

**Description:** When multiple payment requests are processed concurrently, data corruption or race conditions may occur.

**Response Handling:**
- Ensure that the SDK can handle concurrent requests safely, and consider using locking mechanisms if necessary.

**Example Error Handling:**
```javascript
async function processPaymentsConcurrently(payments) {
    const promises = payments.map(payment => 
        unipay.initiatePayment(payment.gateway, payment.details)
    );
    
    try {
        const results = await Promise.all(promises);
        return results;
    } catch (error) {
        console.error('Error processing payments:', error.message);
        // Handle any errors from the concurrent processing
    }
}
```

# Folder Structure

```
uniPay/
├── js-sdk/                        # JavaScript SDK
│   ├── src/
│   │   ├── index.js               # Main entry point
│   │   ├── gateways/              # Payment gateway integrations
│   │   │   ├── stripe.js          # Stripe integration
│   │   │   ├── razorpay.js        # Razorpay integration
│   │   │   ├── braintree.js       # Braintree integration
│   │   │   ├── cashfree.js        # Cashfree integration
│   │   │   ├── square.js          # Square integration
│   │   │   └── payu.js            # PayU integration
│   │   ├── utils.js               # Utility functions
│   │   ├── errors.js              # Custom error handling
│   │   └── validators.js          # Input validation
│   ├── tests/                     # Testing scripts
│   ├── index.cjs.js               # CommonJS entry point
│   ├── package.json               # Package configuration for npm
│   └── README.md                  # Documentation for JavaScript SDK
```

## Testing

To ensure the SDK's reliability, it is essential to test various scenarios, including valid payments, failed transactions, and edge cases mentioned above.

## Contributing

Contributions are welcome! If you would like to contribute to **uniPay**, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Make your changes and commit them (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Create a new Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any inquiries or support, feel free to contact:

**Email:** pushparajmehta002@gmail.com

---
Thank you for choosing **uniPay**! We hope this SDK makes payment processing easier and more efficient for your applications.

# Note
This package is currently in the development phase. It may contain errors, and I have not tested it in detail. Please exercise caution before using it.

