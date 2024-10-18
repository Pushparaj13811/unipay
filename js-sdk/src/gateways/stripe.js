import Stripe from 'stripe';
import { UniPayError } from '../errors.js';

class StripeGateway {
  constructor(credentials) {
    this.stripe = new Stripe(credentials.apiKey);
  }

  async processPayment(paymentData) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Stripe expects amount in cents
        currency: paymentData.currency,
        description: paymentData.description,
        payment_method_types: ['card'],
        capture_method: 'automatic',
        metadata: {
          customerEmail: paymentData.customerEmail,
          customerPhone: paymentData.customerPhone
        }
      });
      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret
      };
    } catch (error) {
      throw new UniPayError(`Stripe Payment Error: ${error.message}`, error.statusCode);
    }
  }

  async capturePayment(paymentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.capture(paymentId);
      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      };
    } catch (error) {
      throw new UniPayError(`Stripe Capture Error: ${error.message}`, error.statusCode);
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      };
    } catch (error) {
      throw new UniPayError(`Stripe Status Error: ${error.message}`, error.statusCode);
    }
  }

  async handleWebhook(webhookData) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        webhookData.body,
        webhookData.signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      // Process the event based on its type
      switch (event.type) {
        case 'payment_intent.succeeded':
          // Handle successful payment
          break;
        case 'payment_intent.payment_failed':
          // Handle failed payment
          break;
        // Add more event types as needed
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
      return event;
    } catch (error) {
      throw new UniPayError(`Stripe Webhook Error: ${error.message}`, error.statusCode);
    }
  }
}

export default StripeGateway;
