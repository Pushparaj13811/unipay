import crypto from "crypto";
import axios from "axios";
import { UniPayError } from "../errors.js";

class PayUGateway {
  constructor(credentials) {
    this.merchantKey = credentials.merchantKey;
    this.merchantSalt = credentials.merchantSalt;
    this.baseUrl =
      credentials.environment === "production"
        ? "https://secure.payu.in"
        : "https://sandboxsecure.payu.in";
  }

  async processPayment(paymentData) {
    try {
      const txnId = `txn_${Date.now()}`;
      const hashString = `${this.merchantKey}|${txnId}|${paymentData.amount}|${paymentData.productInfo}|${paymentData.customerName}|${paymentData.customerEmail}|||||||||||${this.merchantSalt}`;
      const hash = crypto.createHash("sha512").update(hashString).digest("hex");

      const paymentParams = {
        key: this.merchantKey,
        txnid: txnId,
        amount: paymentData.amount,
        productinfo: paymentData.productInfo,
        firstname: paymentData.customerName,
        email: paymentData.customerEmail,
        phone: paymentData.customerPhone,
        surl: paymentData.successUrl,
        furl: paymentData.failureUrl,
        hash: hash,
      };

      // In a real implementation, you would redirect the user to the PayU payment page
      // Here, we're simulating the process by returning the payment parameters
      return {
        id: txnId,
        amount: paymentData.amount,
        currency: "INR", // PayU India typically uses INR
        paymentUrl: `${this.baseUrl}/_payment`,
        paymentParams: paymentParams,
      };
    } catch (error) {
      throw new UniPayError(`PayU Payment Error: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const command = "verify_payment";
      const var1 = paymentId;
      const hashString = `${this.merchantKey}|${command}|${var1}|${this.merchantSalt}`;
      const hash = crypto.createHash("sha512").update(hashString).digest("hex");

      const response = await axios.post(
        `${this.baseUrl}/merchant/postservice?form=2`,
        {
          key: this.merchantKey,
          command: command,
          var1: var1,
          hash: hash,
        }
      );

      return {
        id: response.data.transaction_details[paymentId].txnid,
        amount: response.data.transaction_details[paymentId].amt,
        status: response.data.transaction_details[paymentId].status,
      };
    } catch (error) {
      throw new UniPayError(`PayU Status Error: ${error.message}`);
    }
  }

  async handleWebhook(webhookData) {
    // Implement webhook handling logic here
    throw new UniPayError("PayU webhook handling not implemented");
  }
}

export default PayUGateway;
