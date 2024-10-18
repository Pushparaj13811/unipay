const { createRequire } = require('module');
const require = createRequire(import.meta.url);

import { PaymentGateway } from './gateways/index.js';
import { handleWebhook, createPaymentGateway } from './utils.js';
import { validatePaymentData, validateWebhook, validateGatewayCredentials } from './validators.js';
import { UniPayError } from './errors.js';

class UniPay {
  constructor() {
    this.gateways = {};
  }
  registerPaymentGateway(gatewayName, credentials) {
    validateGatewayCredentials(gatewayName, credentials);
    this.gateways[gatewayName] = createPaymentGateway(gatewayName, credentials);
  }

  async initiatePayment(gatewayName, paymentData) {
    validatePaymentData(gatewayName,paymentData);
    try {
      const gateway = this.getGateway(gatewayName);
      const paymentResponse = await gateway.processPayment(paymentData);

      if (!paymentResponse.id) throw new UniPayError('Payment ID is missing.');

      return paymentResponse;
    } catch (error) {
      throw new UniPayError(`Payment Initialization Failed: ${error.message}`);
    }
  }

  async checkStatus(gatewayName, paymentId) {
    try {
      const gateway = this.getGateway(gatewayName);
      const status = await gateway.getPaymentStatus(paymentId);
      return status;
    } catch (error) {
      throw new UniPayError(`Unable to get payment status: ${error.message}`);
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

  async handleWebhook(gatewayName, requestData) {
    validateWebhook(gatewayName, requestData);
    try {
      return handleWebhook(gatewayName, requestData);
    } catch (error) {
      throw new UniPayError(`Webhook Error: ${error.message}`);
    }
  }

  getGateway(gatewayName) {
    const gateway = this.gateways[gatewayName];
    if (!gateway) {
      throw new UniPayError(`Gateway ${gatewayName} not registered`);
    }
    return gateway;
  }
}

export default UniPay;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniPay; 
}
