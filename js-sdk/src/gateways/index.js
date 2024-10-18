import StripeGateway from './stripe.js';
import RazorpayGateway from './razorpay.js';

export class PaymentGateway {
  static initialize(gatewayName, config) {
    switch (gatewayName.toLowerCase()) {
      case 'stripe':
        return new StripeGateway(config.stripe);
      case 'razorpay':
        return new RazorpayGateway(config.razorpay);
      default:
        throw new Error(`Payment gateway ${gatewayName} is not supported`);
    }
  }
}

module.exports = { PaymentGateway };
