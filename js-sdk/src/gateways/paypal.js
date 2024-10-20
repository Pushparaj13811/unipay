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

  async getPaymentStatus(transactionId) {
    const accessToken = await this.generateAccessToken();
    try {
      const options = {
        url: `${this.baseUrl}/v2/checkout/orders/${transactionId}/capture`,
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

  // This method is used to refund the payment
  async processRefund(refundData) {
    try {
      const accessToken = await this.generateAccessToken();
      const options = {
        method: "POST",
        url: `${this.baseUrl}/v2/payments/captures/${refundData.transactionId}/refund`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          amount: {
            value: refundData.amount,
            currency_code: refundData.currency,
          },
        },
      };
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw new UniPayError(`Paypal Refund Error: ${error.message}`);
    }
  }

  // This method is used to create subscription

  async createSubscription(subscriptionData) {
    try {
      const accessToken = await this.generateAccessToken();
      const options = {
        method: "POST",
        url: `${this.baseUrl}/v1/billing/subscriptions`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          plan_id: subscriptionData.planId,
          start_time: subscriptionData.startTime,
          quantity: subscriptionData.quantity,
          subscriber: {
            name: {
              given_name: subscriptionData.givenName,
              surname: subscriptionData.surname,
            },
            email_address: subscriptionData.email,
          },
          application_context: {
            brand_name: subscriptionData.brandName,
            return_url: subscriptionData.returnUrl,
            cancel_url: subscriptionData.cancelUrl,
          },
        },
      };
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw new UniPayError(
        `Paypal Subscription Creation Error: ${error.message}`
      );
    }
  }
  // This method is used to create billing agreement

  async createBillingAgreement(agreementData) {
    try {
      const accessToken = await this.generateAccessToken();
      const options = {
        method: "POST",
        url: `${this.baseUrl}/v1/payments/billing-agreements`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          plan: {
            id: agreementData.planId,
          },
          payer: {
            payment_method: "PAYPAL",
          },
          shipping_address: {
            line1: agreementData.addressLine1,
            city: agreementData.city,
            state: agreementData.state,
            postal_code: agreementData.postalCode,
            country_code: agreementData.countryCode,
          },
          application_context: {
            brand_name: agreementData.brandName,
            return_url: agreementData.returnUrl,
            cancel_url: agreementData.cancelUrl,
          },
        },
      };
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw new UniPayError(`Paypal Billing Agreement Error: ${error.message}`);
    }
  }

  // This method is used to execute billing agreement
  async vaultPaymentMethod(paymentMethodData) {
    try {
      const accessToken = await this.generateAccessToken();
      const options = {
        method: "POST",
        url: `${this.baseUrl}/v1/vault/credit-cards`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          payer_id: paymentMethodData.payerId,
          number: paymentMethodData.cardNumber,
          type: paymentMethodData.cardType,
          expire_month: paymentMethodData.expiryMonth,
          expire_year: paymentMethodData.expiryYear,
          cvv2: paymentMethodData.cvv,
          first_name: paymentMethodData.firstName,
          last_name: paymentMethodData.lastName,
          billing_address: {
            line1: paymentMethodData.addressLine1,
            city: paymentMethodData.city,
            state: paymentMethodData.state,
            postal_code: paymentMethodData.postalCode,
            country_code: paymentMethodData.countryCode,
          },
        },
      };
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw new UniPayError(
        `Paypal Vault Payment Method Error: ${error.message}`
      );
    }
  }
  // This method is used to create invoice

  async createInvoice(invoiceData) {
    try {
      const accessToken = await this.generateAccessToken();
      const options = {
        method: "POST",
        url: `${this.baseUrl}/v2/invoicing/invoices`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          detail: {
            currency_code: invoiceData.currency,
            note: invoiceData.note,
            terms_and_conditions: invoiceData.terms,
          },
          primary_recipients: [
            {
              billing_info: {
                email_address: invoiceData.email,
              },
            },
          ],
          items: invoiceData.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit_amount: {
              currency_code: invoiceData.currency,
              value: item.unitAmount,
            },
          })),
          due_date: invoiceData.dueDate,
        },
      };
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw new UniPayError(`Paypal Invoice Creation Error: ${error.message}`);
    }
  }
}
