const { createRequire } = require('module');
const require = createRequire(import.meta.url);

import { PaymentGateway } from './gateways/index.js';
import { handleWebhook } from './utils.js';
import { UniPayError } from './errors.js';

class UniPay {
  constructor(config) {
    this.config = config;
    this.gateway = null;
  }

  async initiatePayment(gatewayName, paymentData) {
    try {
      this.gateway = PaymentGateway.initialize(gatewayName, this.config);
      const paymentResponse = await this.gateway.processPayment(paymentData);

      if (!paymentResponse.id) throw new UniPayError('Payment ID is missing.');

      return paymentResponse;
    } catch (error) {
      throw new UniPayError(`Payment Initialization Failed: ${error.message}`);
    }
  }

  async capturePayment(gatewayName, paymentId) {
    try {
      this.gateway = PaymentGateway.initialize(gatewayName, this.config);
      const captureResponse = await this.gateway.capturePayment(paymentId);
      return captureResponse;
    } catch (error) {
      throw new UniPayError(`Payment Capture Failed: ${error.message}`);
    }
  }

  async retryPayment(gatewayName, paymentData, maxRetries = 3) {
    let retryCount = 0;
    let paymentResponse = null;

    while (retryCount < maxRetries) {
      try {
        paymentResponse = await this.initiatePayment(gatewayName, paymentData);
        return paymentResponse;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new UniPayError(`Payment failed after ${maxRetries} retries`);
        }
      }
    }
  }

  async getPaymentStatus(gatewayName, paymentId) {
    try {
      this.gateway = PaymentGateway.initialize(gatewayName, this.config);
      const status = await this.gateway.getPaymentStatus(paymentId);
      return status;
    } catch (error) {
      throw new UniPayError(`Unable to get payment status: ${error.message}`);
    }
  }

  async handleWebhook(gatewayName, requestData) {
    try {
      return handleWebhook(gatewayName, requestData);
    } catch (error) {
      throw new UniPayError(`Webhook Error: ${error.message}`);
    }
  }
}

module.exports = UniPay;
export default UniPay;
