const { createRequire } = require("module");
const require = createRequire(import.meta.url);
import { handleWebhook, createPaymentGateway } from "./utils.js";
import {
  validatePaymentData,
  validateWebhook,
  validateGatewayCredentials,
} from "./validators.js";
import { UniPayError } from "./errors.js";

class UniPay {
  constructor() {
    this.gateways = {};
  }
  registerPaymentGateway(gatewayName, credentials) {
    validateGatewayCredentials(gatewayName, credentials);
    this.gateways[gatewayName] = createPaymentGateway(gatewayName, credentials);
  }

  // This method is used to initiate the payment
  async initiatePayment(gatewayName, paymentData) {
    validatePaymentData(gatewayName, paymentData);
    try {
      const gateway = this.getGateway(gatewayName);
      const paymentResponse = await gateway.processPayment(paymentData);

      if (!paymentResponse.id) throw new UniPayError("Payment ID is missing.");

      return paymentResponse;
    } catch (error) {
      throw new UniPayError(`Payment Initialization Failed: ${error.message}`);
    }
  }
  // This method is used to initiate the recurring payment

  async initiateRecurringPayment(gatewayName, subscriptionData) {
    validatePaymentData(gatewayName, subscriptionData);
    try {
      const gateway = this.getGateway(gatewayName);
      const paymentResponse =
        await gateway.initiateRecurringPayment(subscriptionData);
      if (!paymentResponse.id) {
        throw new UniPayError("Payment ID is missing in the response");
      }
      return paymentResponse;
    } catch (error) {
      throw new UniPayError(
        `Recurring Payment Initialization Failed: ${error.message}`
      );
    }
  }

  // This method is used to check the payment status
  async checkStatus(gatewayName, paymentId) {
    try {
      const gateway = this.getGateway(gatewayName);
      const status = await gateway.getPaymentStatus(paymentId);
      return status;
    } catch (error) {
      throw new UniPayError(`Unable to get payment status: ${error.message}`);
    }
  }

  // This method is used to refund the payment
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
          throw new UniPayError(
            `Payment failed after ${maxRetries} retries with error: ${error.message}`
          );
        }
      }
    }
  }

  async refundPayment(gatewayName, refundData) {
    try {
      validateRefundData(gatewayName, refundData);
      const gateway = this.getGateway(gatewayName);
      const refundResponse = await gateway.processRefund(refundData);
      if (!refundResponse.refundId) {
        throw new UniPayError("Refund ID is missing in the response");
      }
      return refundResponse;
    } catch (error) {
      throw new UniPayError(`Refund Processing Failed: ${error.message}`);
    }
  }
  // This method is used to handle the webhook
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
if (typeof module !== "undefined" && module.exports) {
  module.exports = UniPay;
}
