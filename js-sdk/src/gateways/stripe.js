import Stripe from 'stripe';

class StripeGateway {
  constructor(config) {
    this.stripe = new Stripe(config.apiKey);
  }

  async processPayment(paymentData) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: paymentData.amount,
        currency: paymentData.currency,
        payment_method_types: ['card'],
        capture_method: 'automatic', 
      });
      return paymentIntent;
    } catch (error) {
      throw new Error(`Stripe Payment Error: ${error.message}`);
    }
  }

  async capturePayment(paymentId) {
    try {
      const captured = await this.stripe.paymentIntents.capture(paymentId);
      return captured;
    } catch (error) {
      throw new Error(`Stripe Capture Error: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
      return paymentIntent.status;
    } catch (error) {
      throw new Error(`Stripe Status Error: ${error.message}`);
    }
  }
}

module.exports = StripeGateway;
