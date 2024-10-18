import braintree from "braintree";
import { UniPayError } from "../errors.js";

class BraintreeGateway {
  constructor(credentials) {
    this.gateway = new braintree.BraintreeGateway({
      environment: credentials.environment || braintree.Environment.Sandbox,
      merchantId: credentials.merchantId,
      publicKey: credentials.publicKey,
      privateKey: credentials.privateKey,
    });
  }

  async processPayment(paymentData) {
    try {
      const result = await this.gateway.transaction.sale({
        amount: paymentData.amount.toString(),
        paymentMethodNonce: paymentData.nonce,
        options: {
          submitForSettlement: true,
        },
        customer: {
          email: paymentData.customerEmail,
          phone: paymentData.customerPhone,
        },
        customFields: {
          description: paymentData.description,
        },
      });

      if (!result.success) {
        throw new UniPayError(`Braintree Payment Error: ${result.message}`);
      }

      return {
        id: result.transaction.id,
        amount: parseFloat(result.transaction.amount),
        currency: result.transaction.currencyIsoCode,
        status: result.transaction.status,
      };
    } catch (error) {
      throw new UniPayError(`Braintree Payment Error: ${error.message}`);
    }
  }

  async capturePayment(paymentId) {
    try {
      const result =
        await this.gateway.transaction.submitForSettlement(paymentId);

      if (!result.success) {
        throw new UniPayError(`Braintree Capture Error: ${result.message}`);
      }

      return {
        id: result.transaction.id,
        amount: parseFloat(result.transaction.amount),
        currency: result.transaction.currencyIsoCode,
        status: result.transaction.status,
      };
    } catch (error) {
      throw new UniPayError(`Braintree Capture Error: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const transaction = await this.gateway.transaction.find(paymentId);
      return {
        id: transaction.id,
        amount: parseFloat(transaction.amount),
        currency: transaction.currencyIsoCode,
        status: transaction.status,
      };
    } catch (error) {
      throw new UniPayError(`Braintree Status Error: ${error.message}`);
    }
  }

  async handleWebhook(webhookData) {
    try {
      const webhookNotification = await this.gateway.webhookNotification.parse(
        webhookData.bt_signature,
        webhookData.bt_payload
      );

      // Process the webhook notification based on its kind
      switch (webhookNotification.kind) {
        case braintree.WebhookNotification.Kind.TransactionSettled:
          // Handle settled transaction
          break;
        case braintree.WebhookNotification.Kind.TransactionSettlementDeclined:
          // Handle declined settlement
          break;
        // Add more notification kinds as needed
        default:
          console.log(
            `Unhandled webhook notification kind: ${webhookNotification.kind}`
          );
      }

      return webhookNotification;
    } catch (error) {
      throw new UniPayError(`Braintree Webhook Error: ${error.message}`);
    }
  }
}

export default BraintreeGateway;
