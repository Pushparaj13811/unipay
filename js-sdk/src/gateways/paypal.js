import axios from "axios";
import { UniPayError } from "../errors";

class PaypalGateway {
  constructor(credentials) {
    this.baseUrl = "https://api-preprod.paypal.com";
    this.merchantId = credentials.merchantId;
    this.merchantSecret = credentials.merchantSecret;
  }
  // Method to generate access token

  async generateAccessToken() {
    try {
      const options = {
        method: "POST",
        url: `${this.baseUrl}/v1/oauth2/token`,
        data: "grant_type=client_credentials",
        auth: {
          username: this.merchantId,
          password: this.merchantSecret,
        },
      };
      const response = await axios.request(options);
      return response.data.access_token;
    } catch (error) {
      throw new UniPayError(`Paypal Access Token Error: ${error.message}`);
    }
  }

  // This method is used to create order

  async processPayment(paymentData) {
    const accessToken = await this.generateAccessToken();

    try {
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        data: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              items: [
                {
                  name: paymentData.itemName,
                  description: paymentData.itemDescription,
                  quantity: paymentData.quantity,
                  unit_amount: {
                    currency_code: paymentData.currency,
                    value: paymentData.amount,
                  },
                },
              ],
              amount: {
                currency_code: paymentData.currency,
                value: paymentData.amount,
                breakdown: {
                  item_total: {
                    currency_code: paymentData.currency,
                    vlaue: paymentData.amount,
                  },
                },
              },
            },
          ],
          application_context: {
            return_url: paymentData.returnUrl,
            cancel_url: paymentData.cancel_url,
            shipping_preference: paymentData.shippingPreference,
            user_action: paymentData.userAction,
            brand_name: paymentData.brandName,
          },
        }),
      };

      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw new UniPayError(
        `Paypal Payment Initiating Error: ${error.message}`
      );
    }
  }

  // This method is used to capture the payment

  async capturePayment(orderId) {
    const accessToken = await this.generateAccessToken();
    try {
      const options = {
        url: `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        data: JSON.stringify({}),
      };

      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw new UniPayError(`Paypal Capture Payment Error: ${error.message}`);
    }
  }
}
