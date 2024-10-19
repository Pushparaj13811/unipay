import axios from "axios";
import { UniPayError } from "../errors";

class PhonePayGateway {
  constructor(credentials) {
    this.baseUrl = "https://api-preprod.phonepe.com/apis/pg-sandbox";
    this.merchantId = credentials.merchantId;
    this.merchantSecret = credentials.merchantSecret;
  }

  // This method is used to process the payment
  async processPayment(paymentData) {
    try {
      const options = {
        method: "POST",
        url: `${this.baseUrl}/pg/v1/pay`,
        headers: {
          Accept: "text/plain",
          "Content-Type": "application/json",
        },
        data: {
          merchantId: this.merchantId,
          transactionId: paymentData.transactionId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paymentOptions: paymentData.paymentOptions,
          callbackUrl: paymentData.returnUrl,
        },
      };
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw new UniPayError(`PhonePe Payment Error: ${error.message}`);
    }
  }

  // This method is used to initiate the recurring payment

  async initiateRecurringPayment(subscriptionData) {
    try {
      const options = {
        method: "POST",
        url: `${this.baseUrl}/pg/v1/recurring/pay`,
        headers: {
          Accept: "text/plain",
          "Content-Type": "application/json",
          "X-VERIFY": this.getXVerifyHeader(subscriptionData),
        },
        data: {
          merchantId: this.merchantId,
          subscriptionId: subscriptionData.subscriptionId,
          amount: subscriptionData.amount,
          currency: subscriptionData.currency,
          paymentOptions: subscriptionData.paymentOptions,
          callbackUrl: subscriptionData.returnUrl,
        },
      };
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw new UniPayError(
        `PhonePe Recurring Payment Error: ${error.message}`
      );
    }
  }

  // This method is used to get the payment status
  async getPaymentStatus(transactionId) {
    try {
      const options = {
        method: "GET",
        url: `${this.baseUrl}/pg/v1/status/${transactionId}`,
        headers: {
          Accept: "text/plain",
          "Content-Type": "application/json",
          "X-VERIFY": this.getXVerifyHeader({ transactionId }),
        },
      };
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw new UniPayError(`PhonePe Payment Status Error: ${error.message}`);
    }
  }

  // This method is used to refund the payment
  async processRefund(refundData) {
    try {
      const options = {
        method: "POST",
        url: `${this.baseUrl}/pg/v1/refund`,
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": this.getXVerifyHeader(refundData),
        },
        data: {
          merchantId: this.merchantId,
          transactionId: refundData.transactionId,
          amount: refundData.amount,
          merchandOrderId: refundData.merchandOrderId,
          reason: refundData.reason || "Refund requested by customer",
        },
      };
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw new UniPayError(`PhonePe Refund Error: ${error.message}`);
    }
  }
}

export default PhonePayGateway;
