const UniPay = require('unipay-js-sdk');

// Create a new instance of UniPay
const unipay = new UniPay();

// Register payment gateways
unipay.registerPaymentGateway('stripe', {
  apiKey: 'your_stripe_api_key'
});

unipay.registerPaymentGateway('razorpay', {
  apiKey: 'your_razorpay_key_id',
  apiSecret: 'your_razorpay_key_secret'
});

// Example function to process a payment
async function processPayment(gateway, paymentDetails) {
  try {
    const result = await unipay.initiatePayment(gateway, paymentDetails);
    console.log(`Payment processed successfully using ${gateway}:`, result);
    return result;
  } catch (error) {
    console.error(`Payment processing failed with ${gateway}:`, error.message);
    throw error;
  }
}

// Example usage
const stripePayment = {
  amount: 1000, // Amount in cents
  currency: 'USD',
  description: 'Test payment with Stripe',
  customerEmail: 'customer@example.com',
  customerPhone: '+1234567890'
};

processPayment('stripe', stripePayment)
  .then(result => console.log(result))
  .catch(error => console.error(error));

// Example of checking payment status
async function checkPaymentStatus(gateway, paymentId) {
  try {
    const status = await unipay.checkStatus(gateway, paymentId);
    console.log(`Payment status for ${gateway}:`, status);
    return status;
  } catch (error) {
    console.error(`Failed to check payment status for ${gateway}:`, error.message);
    throw error;
  }
}

// Assuming you have a payment ID from a previous transaction
const stripePaymentId = 'pi_1234567890';

checkPaymentStatus('stripe', stripePaymentId)
  .then(status => console.log(status))
  .catch(error => console.error(error));
