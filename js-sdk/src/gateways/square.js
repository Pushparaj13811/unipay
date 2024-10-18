import { Client, Environment } from 'square';
import { UniPayError } from '../errors.js';

class SquareGateway {
  constructor(credentials) {
    this.client = new Client({
      accessToken: credentials.accessToken,
      environment: credentials.environment === 'production' ? Environment.Production : Environment.Sandbox
    });
    this.paymentsApi = this.client.paymentsApi;
  }

  async processPayment(paymentData) {
    try {
      const response = await this.paymentsApi.createPayment({
        sourceId: paymentData.sourceId,
        idempotencyKey: `idempotency_key_${Date.now()}`,
        amountMoney: {
          amount: Math.round(paymentData.amount * 100),
          currency: paymentData.currency
        },
        customerId: paymentData.customerId
      });

      return {
        id: response.result.payment.id,
        amount: response.result.payment.amountMoney.amount / 100,
        currency: response.result.payment.amountMoney.currency,
        status: response.result.payment.status
      };
    } catch (error) {
      throw new UniPayError(`Square Payment Error: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const response = await this.paymentsApi.getPayment(paymentId);

      return {
        id: response.result.payment.id,
        amount: response.result.payment.amountMoney.amount / 100,
        currency: response.result.payment.amountMoney.currency,
        status: response.result.payment.status
      };
    } catch (error) {
      throw new UniPayError(`Square Status Error: ${error.message}`);
    }
  }

  async handleWebhook(webhookData) {
    // Implement webhook handling logic here
    throw new UniPayError('Square webhook handling not implemented');
  }
}

export default SquareGateway;
