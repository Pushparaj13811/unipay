import Razorpay from 'razorpay';
import { UniPayError } from '../errors.js';

class RazorpayGateway {
  constructor(credentials) {
    this.instance = new Razorpay({
      key_id: credentials.apiKey,
      key_secret: credentials.apiSecret,
    });
  }

  async processPayment(paymentData) {
    try {
      const order = await this.instance.orders.create({
        amount: paymentData.amount * 100, // Razorpay expects amount in paise
        currency: paymentData.currency,
        receipt: paymentData.receipt || `receipt_${Date.now()}`,
        notes: {
          email: paymentData.customerEmail,
          phone: paymentData.customerPhone,
          description: paymentData.description
        },
        payment_capture: 1,
      });
      return {
        id: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        receipt: order.receipt,
      };
    } catch (error) {
      throw new UniPayError(`Razorpay Payment Error: ${error.message}`, error.statusCode);
    }
  }

  async capturePayment(paymentId, amount) {
    try {
      const payment = await this.instance.payments.capture(paymentId, amount * 100);
      return {
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
      };
    } catch (error) {
      throw new UniPayError(`Razorpay Capture Error: ${error.message}`, error.statusCode);
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const payment = await this.instance.payments.fetch(paymentId);
      return {
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
      };
    } catch (error) {
      throw new UniPayError(`Razorpay Status Error: ${error.message}`, error.statusCode);
    }
  }

  async handleWebhook(webhookData) {
    // Implement Razorpay-specific webhook handling logic here
    // This method should verify the webhook signature and process the event
    // Return processed webhook data or throw an error if verification fails
    throw new UniPayError('Razorpay webhook handling not implemented');
  }
}

export default RazorpayGateway;
