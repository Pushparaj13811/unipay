import UniPay from 'unipay-js-sdk';

const unipay = new UniPay();

unipay.registerPaymentGateway('stripe', {
  apiKey: 'your_stripe_api_key'
});

unipay.registerPaymentGateway('razorpay', {
  apiKey: 'your_razorpay_key_id',
  apiSecret: 'your_razorpay_key_secret'
});

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

const razorpayPayment = {
  amount: 50000,
  currency: 'INR',
  description: 'Test payment with Razorpay',
  customerEmail: 'customer@example.com',
  customerPhone: '+1234567890'
};

(async () => {
  try {
    const result = await processPayment('razorpay', razorpayPayment);
    console.log(result);
  } catch (error) {
    console.error(error);
  }
})();

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

(async () => {
  try {
    const status = await checkPaymentStatus('razorpay', 'pay_1234567890');
    console.log(status);
  } catch (error) {
    console.error(error);
  }
})();

