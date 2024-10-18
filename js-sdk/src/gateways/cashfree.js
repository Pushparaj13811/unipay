import axios from "axios";
import { UniPayError } from "../errors.js";

class CashfreeGateway {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.baseUrl =
      credentials.environment === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";
  }

  async processPayment(paymentData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        {
          order_id: `order_${Date.now()}`,
          order_amount: paymentData.amount,
          order_currency: paymentData.currency,
          customer_details: {
            customer_id: paymentData.customerId,
            customer_email: paymentData.customerEmail,
            customer_phone: paymentData.customerPhone,
          },
          order_meta: {
            return_url: paymentData.returnUrl,
          },
        },
        {
          headers: {
            "x-client-id": this.apiKey,
            "x-client-secret": this.apiSecret,
          },
        }
      );

      return {
        id: response.data.order_id,
        amount: response.data.order_amount,
        currency: response.data.order_currency,
        paymentLink: response.data.payment_link,
      };
    } catch (error) {
      throw new UniPayError(`Cashfree Payment Error: ${error.message}`);
    }
  }

  async getPaymentStatus(orderId) {
    try {
      const response = await axios.get(`${this.baseUrl}/orders/${orderId}`, {
        headers: {
          "x-client-id": this.apiKey,
          "x-client-secret": this.apiSecret,
        },
      });

      return {
        id: response.data.order_id,
        amount: response.data.order_amount,
        currency: response.data.order_currency,
        status: response.data.order_status,
      };
    } catch (error) {
      throw new UniPayError(`Cashfree Status Error: ${error.message}`);
    }
  }

  async handleWebhook(webhookData) {
    // Implement webhook handling logic here
    throw new UniPayError("Cashfree webhook handling not implemented");
  }
}

export default CashfreeGateway;
