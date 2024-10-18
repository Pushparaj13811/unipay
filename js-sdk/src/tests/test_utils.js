import { handleWebhook, createPaymentGateway } from '../utils.js';
import { UniPayError } from '../errors.js';
import StripeGateway from '../gateways/stripe.js';
import RazorpayGateway from '../gateways/razorpay.js';

jest.mock('../gateways/stripe.js');
jest.mock('../gateways/razorpay.js');

describe('Utils', () => {
  describe('handleWebhook', () => {
    it('should call verifyStripeWebhook for Stripe', () => {
      const mockRequestData = { body: 'test', headers: { 'stripe-signature': 'sig' } };
      handleWebhook('stripe', mockRequestData);
      expect(StripeGateway).toHaveBeenCalled();
    });

    it('should call verifyRazorpayWebhook for Razorpay', () => {
      const mockRequestData = { body: 'test', headers: { 'x-razorpay-signature': 'sig' } };
      handleWebhook('razorpay', mockRequestData);
      expect(RazorpayGateway).toHaveBeenCalled();
    });

    it('should throw for unsupported gateway', () => {
      expect(() => handleWebhook('unsupported', {})).toThrow(UniPayError);
    });
  });

  describe('createPaymentGateway', () => {
    it('should create a Stripe gateway', () => {
      const gateway = createPaymentGateway('stripe', { apiKey: 'test_key' });
      expect(gateway).toBeInstanceOf(StripeGateway);
    });

    it('should create a Razorpay gateway', () => {
      const gateway = createPaymentGateway('razorpay', { apiKey: 'test_key', apiSecret: 'test_secret' });
      expect(gateway).toBeInstanceOf(RazorpayGateway);
    });

    it('should throw for unsupported gateway', () => {
      expect(() => createPaymentGateway('unsupported', {})).toThrow(UniPayError);
    });
  });
});

