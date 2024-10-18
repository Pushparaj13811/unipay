import Razorpay from 'razorpay';

class RazorpayGateway {
  constructor(config) {
    this.instance = new Razorpay({
      key_id: config.apiKey,
      key_secret: config.secretKey,
    });
  }

  async processPayment(paymentData) {
    try {
      const order = await this.instance.orders.create({
        amount: paymentData.amount,
        currency: paymentData.currency,
        receipt: paymentData.receipt,
        payment_capture: 1, 
      });
      return order;
    } catch (error) {
      throw new Error(`Razorpay Payment Error: ${error.message}`);
    }
  }

  async capturePayment(paymentId) {
    try {
      const payment = await this.instance.payments.capture(paymentId, paymentData.amount, paymentData.currency);
      return payment;
    } catch (error) {
      throw new Error(`Razorpay Capture Error: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const payment = await this.instance.payments.fetch(paymentId);
      return payment.status;
    } catch (error) {
      throw new Error(`Razorpay Status Error: ${error.message}`);
    }
  }
}

module.exports = RazorpayGateway;
