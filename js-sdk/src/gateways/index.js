import StripeGateway from "./stripe.js";
import RazorpayGateway from "./razorpay.js";
import BraintreeGateway from "./braintree.js";
import CashfreeGateway from "./cashfree.js";
import SquareGateway from "./square.js";
import PayUGateway from "./payu.js";
import { UniPayError } from "../errors.js";

export const PaymentGateway = {
  initialize(gatewayName, credentials) {
    switch (gatewayName.toLowerCase()) {
      case "stripe":
        return new StripeGateway(credentials);
      case "razorpay":
        return new RazorpayGateway(credentials);
      case "braintree":
        return new BraintreeGateway(credentials);
      case "cashfree":
        return new CashfreeGateway(credentials);
      case "square":
        return new SquareGateway(credentials);
      case "payu":
        return new PayUGateway(credentials);
      default:
        throw new UniPayError(`Unsupported gateway: ${gatewayName}`);
    }
  },
};

module.exports = { PaymentGateway };
