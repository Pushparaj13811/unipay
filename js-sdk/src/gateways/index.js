import StripeGateway from './stripe.js';
import RazorpayGateway from './razorpay.js';
import { UniPayError } from '../errors.js';

export const PaymentGateway = {
  initialize(gatewayName, credentials) {
    switch (gatewayName.toLowerCase()) {
      case 'stripe':
        return new StripeGateway(credentials);
      case 'razorpay':
        return new RazorpayGateway(credentials);
      default:
        throw new UniPayError(`Unsupported gateway: ${gatewayName}`);
    }
  }
};

module.exports = { PaymentGateway };
