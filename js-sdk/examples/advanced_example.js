// CommonJS syntax
const UniPay = require('../index.cjs.js');

// ES6 module syntax (uncomment the following line and comment out the require statement above if using ES6 modules)
// import UniPay from '../src/index.js';

const unipay = new UniPay();

// Register multiple payment gateways
unipay.registerPaymentGateway('stripe', {
  apiKey: 'your_stripe_api_key'
});

unipay.registerPaymentGateway('razorpay', {
  apiKey: 'your_razorpay_key_id',
  apiSecret: 'your_razorpay_key_secret'
});

unipay.registerPaymentGateway('paypal', {
  clientId: 'your_paypal_client_id',
  clientSecret: 'your_paypal_client_secret'
});

// Advanced payment processing function with retry mechanism
async function processPaymentWithRetry(gateway, paymentDetails, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const result = await unipay.initiatePayment(gateway, paymentDetails);
      console.log(`Payment processed successfully using ${gateway}:`, result);
      return result;
    } catch (error) {
      console.error(`Attempt ${retries + 1} failed for ${gateway}:`, error.message);
      retries++;
      if (retries === maxRetries) {
        throw new Error(`Max retries reached for ${gateway}. Payment failed.`);
      }
      // Wait for 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Example usage with different payment gateways
const payments = [
  { gateway: 'stripe', details: { amount: 2000, currency: 'USD', description: 'Stripe payment' } },
  { gateway: 'razorpay', details: { amount: 100000, currency: 'INR', description: 'Razorpay payment' } },
  { gateway: 'paypal', details: { amount: 30, currency: 'EUR', description: 'PayPal payment' } }
];

// Process multiple payments concurrently
async function processMultiplePayments(payments) {
  try {
    const results = await Promise.all(payments.map(p => processPaymentWithRetry(p.gateway, p.details)));
    console.log('All payments processed:', results);
  } catch (error) {
    console.error('Error processing multiple payments:', error.message);
  }
}

processMultiplePayments(payments);

// Advanced status checking with webhook simulation
async function simulateWebhook(gateway, paymentId) {
  try {
    const webhookData = {
      gateway,
      paymentId,
      event: 'payment.success',
      // Add other relevant webhook data
    };
    const result = await unipay.handleWebhook(gateway, webhookData);
    console.log(`Webhook handled for ${gateway}:`, result);
  } catch (error) {
    console.error(`Webhook handling failed for ${gateway}:`, error.message);
  }
}

// Simulate webhooks for different gateways
setTimeout(() => simulateWebhook('stripe', 'pi_1234567890'), 5000);
setTimeout(() => simulateWebhook('razorpay', 'pay_9876543210'), 7000);

// Error handling demonstration
async function demonstrateErrorHandling() {
  try {
    // Attempt to use an unregistered gateway
    await unipay.initiatePayment('unregistered_gateway', { amount: 100, currency: 'USD' });
  } catch (error) {
    if (error instanceof UniPay.UniPayError) {
      console.error('UniPay specific error:', error.message, 'Code:', error.code);
    } else {
      console.error('Unexpected error:', error.message);
    }
  }
}

demonstrateErrorHandling();

// Cleanup function (if needed)
process.on('SIGINT', async () => {
  console.log('Cleaning up...');
  // Perform any necessary cleanup
  process.exit(0);
});

