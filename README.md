# uniPay

**Author:** Hompushparaj Mehta

**uniPay** is an open-source SDK that unifies multiple payment gateways into a single integration point for developers. With **uniPay**, you can seamlessly integrate various payment gateways like PayPal, Razorpay, Stripe, PhonePe, Paytm, PayU, and Easebuzz without the need to manage multiple routes or endpoints.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [JavaScript (Node.js, Bun, Deno, Hono)](#javascript-nodejs-bun-deno-hono)
  - [PHP (Laravel)](#php-laravel)
  - [Python (Django)](#python-django)
- [Usage](#usage)
  - [JavaScript Example](#javascript-example)
  - [PHP Example](#php-example)
  - [Python Example](#python-example)
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

### JavaScript (Node.js, Bun, Deno, Hono)

To install **uniPay** in a JavaScript project, you can use npm, yarn, or pnpm. Run one of the following commands in your project directory:

```bash
# Using npm
npm install unipay

# Using yarn
yarn add unipay

# Using pnpm
pnpm install unipay
```

### PHP (Laravel)

To install **uniPay** in a Laravel project, you can use Composer. Run the following command in your project directory:

```bash
composer require unipay/unipay
```

### Python (Django)

To install **uniPay** in a Django project, you can use pip. Run the following command in your project directory:

```bash
pip install unipay
```

## Usage

### JavaScript Example

```javascript
// Import the uniPay SDK
const uniPay = require("unipay");

// Create a new instance of uniPay
const paymentProcessor = new uniPay({
  gateways: {
    paypal: {
      clientId: "YOUR_PAYPAL_CLIENT_ID",
      secret: "YOUR_PAYPAL_SECRET",
    },
    razorpay: {
      keyId: "YOUR_RAZORPAY_KEY_ID",
      keySecret: "YOUR_RAZORPAY_KEY_SECRET",
    },
    stripe: {
      apiKey: "YOUR_STRIPE_API_KEY",
    },
    // Add other gateways as needed
  },
});

// Process a payment
const paymentDetails = {
  amount: 1000, // Amount in cents or the smallest currency unit
  currency: "USD",
  paymentGateway: "paypal", // Select the gateway to use
};

paymentProcessor
  .processPayment(paymentDetails)
  .then((response) => {
    console.log("Payment Successful:", response);
  })
  .catch((error) => {
    console.error("Payment Failed:", error);
  });
```

### PHP Example (Laravel)

```php
use Unipay\UniPay;

// Create a new instance of UniPay
$paymentProcessor = new UniPay([
    'gateways' => [
        'paypal' => [
            'clientId' => 'YOUR_PAYPAL_CLIENT_ID',
            'secret' => 'YOUR_PAYPAL_SECRET',
        ],
        'razorpay' => [
            'keyId' => 'YOUR_RAZORPAY_KEY_ID',
            'keySecret' => 'YOUR_RAZORPAY_KEY_SECRET',
        ],
        'stripe' => [
            'apiKey' => 'YOUR_STRIPE_API_KEY',
        ],
        // Add other gateways as needed
    ],
]);

// Process a payment
$paymentDetails = [
    'amount' => 1000, // Amount in smallest currency unit
    'currency' => 'USD',
    'paymentGateway' => 'paypal', // Select the gateway to use
];

try {
    $response = $paymentProcessor->processPayment($paymentDetails);
    echo 'Payment Successful: ' . json_encode($response);
} catch (Exception $e) {
    echo 'Payment Failed: ' . $e->getMessage();
}
```

### Python Example (Django)

```python
from unipay import UniPay

# Create a new instance of UniPay
payment_processor = UniPay(gateways={
    'paypal': {
        'clientId': 'YOUR_PAYPAL_CLIENT_ID',
        'secret': 'YOUR_PAYPAL_SECRET',
    },
    'razorpay': {
        'keyId': 'YOUR_RAZORPAY_KEY_ID',
        'keySecret': 'YOUR_RAZORPAY_KEY_SECRET',
    },
    'stripe': {
        'apiKey': 'YOUR_STRIPE_API_KEY',
    },
    # Add other gateways as needed
})

# Process a payment
payment_details = {
    'amount': 1000,  # Amount in smallest currency unit
    'currency': 'USD',
    'paymentGateway': 'paypal',  # Select the gateway to use
}

try:
    response = payment_processor.process_payment(payment_details)
    print('Payment Successful:', response)
except Exception as e:
    print('Payment Failed:', str(e))
```

## Supported Gateways

- PayPal
- Razorpay
- Stripe
- PhonePe
- Paytm
- PayU
- Easebuzz

## Configuration

You can configure the payment gateways in the `uniPay` instance as shown in the usage examples. Each gateway requires specific credentials. Make sure to replace placeholder values with your actual credentials.

## Error Handling

**uniPay** provides a consistent error handling mechanism. If a payment fails, it will throw a specific error related to the payment gateway. You can catch and handle these errors in your application.

### Example Error Handling

```javascript
paymentProcessor
  .processPayment(paymentDetails)
  .then((response) => {
    console.log("Payment Successful:", response);
  })
  .catch((error) => {
    if (error instanceof uniPay.PaymentError) {
      console.error("Payment Error:", error.message);
    } else if (error instanceof uniPay.GatewayError) {
      console.error("Gateway Error:", error.message);
    } else {
      console.error("Unknown Error:", error.message);
    }
  });
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
    const response = await paymentProcessor.processPayment(paymentDetails);
} catch (error) {
    if (error instanceof uniPay.CredentialsError) {
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
    const response = await paymentProcessor.processPayment(paymentDetails);
} catch (error) {
    if (error instanceof uniPay.InsufficientFundsError) {
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
async function processPaymentWithRetry(paymentDetails, retries = 3) {
    while (retries > 0) {
        try {
            const response = await paymentProcessor.processPayment(paymentDetails);
            return response;
        } catch (error) {
            if (error instanceof uniPay.NetworkError) {
                console.error('Network Error:', error.message);
                retries--;
                if (retries === 0) {
                    // Inform the user about the network issue
                }
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
- Validate the currency before processing the payment and return a specific error if there’s a mismatch.

**Example Error Handling:**
```javascript
const validCurrencies = ['USD', 'INR', 'EUR']; // Add your valid currencies here

if (!validCurrencies.includes(paymentDetails.currency)) {
    throw new uniPay.CurrencyMismatchError('Invalid currency specified.');
}
```

### 5. Payment Timeout

**Description:** Payment processing may hang due to unresponsive payment gateways.

**Response Handling:**
- Set a timeout for payment processing and handle timeout errors appropriately.

**Example Error Handling:**
```javascript
const paymentWithTimeout = async (paymentDetails) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

    try {
        const response = await paymentProcessor.processPayment(paymentDetails, { signal: controller.signal });
        clearTimeout(timeout);
        return response;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Payment Timeout: The payment processing took too long.');
            // Handle timeout error
        }
    }
};
```

### 6. Concurrency Issues

**Description:** When multiple payment requests are processed concurrently, data corruption or race conditions may occur.

**Response Handling:**
- Ensure that the SDK can handle concurrent requests safely, and consider using locking mechanisms if necessary.

**Example Error Handling:**
```javascript
async function processPaymentsConcurrently(payments) {
    const promises = payments.map(payment => paymentProcessor.processPayment(payment));
    
    try {
        const results = await Promise.all(promises);
        return results;
    } catch (error) {
        console.error('Error processing payments:', error.message);
        // Handle any errors from the concurrent processing
    }
}
```

## Supported Frameworks and Languages

Below are the installation instructions and usage examples for the supported frameworks and languages.

### JavaScript (Node.js, Bun, Deno, Hono)

#### Installation
```bash
# Using npm
npm install unipay

# Using yarn
yarn add unipay

# Using pnpm
pnpm install unipay
```

#### Example Code
```javascript
const uniPay = require('unipay');

const paymentProcessor = new uniPay({
    gateways: {
        paypal: { clientId: 'YOUR_PAYPAL_CLIENT_ID', secret: 'YOUR_PAYPAL_SECRET' },
        razorpay: { keyId: 'YOUR_RAZORPAY_KEY_ID', keySecret: 'YOUR_RAZORPAY_KEY_SECRET' },
        stripe: { apiKey: 'YOUR_STRIPE_API_KEY' },
        // Add other gateways as needed
    }
});

// Process a payment
const paymentDetails = { amount: 1000, currency: 'USD', paymentGateway: 'paypal' };

paymentProcessor.processPayment(paymentDetails)
    .then(response => {
        console.log('Payment Successful:', response);
    })
    .catch(error => {
        console.error('Payment Failed:', error);
        // Handle specific error cases as demonstrated above
    });
```

### PHP (Laravel)

#### Installation
```bash
composer require unipay/unipay
```

#### Example Code
```php
use Unipay\UniPay;

$paymentProcessor = new UniPay([
    'gateways' => [
        'paypal' => ['clientId' => 'YOUR_PAYPAL_CLIENT_ID', 'secret' => 'YOUR_PAYPAL_SECRET'],
        'razorpay' => ['keyId' => 'YOUR_RAZORPAY_KEY_ID', 'keySecret' => 'YOUR_RAZORPAY_KEY_SECRET'],
        'stripe' => ['apiKey' => 'YOUR_STRIPE_API_KEY'],
        // Add other gateways as needed
    ],
]);

$paymentDetails = ['amount' => 1000, 'currency' => 'USD', 'paymentGateway' => 'paypal'];

try {
    $response = $paymentProcessor->processPayment($paymentDetails);
    echo 'Payment Successful: ' . json_encode($response);
} catch (Exception $e) {
    echo 'Payment Failed: ' . $e->getMessage();
    // Handle specific error cases as demonstrated above
}
```

### Python (Django)

#### Installation
```bash
pip install unipay
```

#### Example Code
```python
from unipay import UniPay

payment_processor = UniPay(gateways={
    'paypal': {'clientId': 'YOUR_PAYPAL_CLIENT_ID', 'secret': 'YOUR_PAYPAL_SECRET'},
    'razorpay': {'keyId': 'YOUR_RAZORPAY_KEY_ID', 'keySecret': 'YOUR_RAZORPAY_KEY_SECRET'},
    'stripe': {'apiKey': 'YOUR_STRIPE_API_KEY'},
    # Add other gateways as needed
})

payment_details = {'amount': 1000, 'currency': 'USD', 'paymentGateway': 'paypal'}

try:
    response = payment_processor.process_payment(payment_details)
    print('Payment Successful:', response)
except Exception as e:
    print('Payment Failed:', str(e))
    # Handle specific error cases as demonstrated above
```

# Folder Structure



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