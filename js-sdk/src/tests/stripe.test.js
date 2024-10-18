import StripeGateway from '../gateways/stripe';
import { UniPayError } from '../errors';
import Stripe from 'stripe';

jest.mock('stripe');

describe('StripeGateway', () => {
  let gateway;

  beforeEach(() => {
    gateway = new StripeGateway({
      apiKey: 'test_api_key'
    });
  });

  test('processPayment should create a payment intent', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      id: 'test_payment_intent_id',
      amount: 1000,
      currency: 'usd',
      status: 'requires_payment_method',
      client_secret: 'test_client_secret'
    });
    gateway.stripe.paymentIntents.create = mockCreate;

    const result = await gateway.processPayment({
      amount: 10,
      currency: 'usd',
      description: 'Test payment',
      customerEmail: 'test@example.com',
      customerPhone: '1234567890'
    });

    expect(result).toEqual({
      id: 'test_payment_intent_id',
      amount: 10,
      currency: 'usd',
      status: 'requires_payment_method',
      clientSecret: 'test_client_secret'
    });
    expect(mockCreate).toHaveBeenCalled();
  });

  test('getPaymentStatus should retrieve payment intent status', async () => {
    const mockRetrieve = jest.fn().mockResolvedValue({
      id: 'test_payment_intent_id',
      amount: 1000,
      currency: 'usd',
      status: 'succeeded'
    });
    gateway.stripe.paymentIntents.retrieve = mockRetrieve;

    const result = await gateway.getPaymentStatus('test_payment_intent_id');

    expect(result).toEqual({
      id: 'test_payment_intent_id',
      amount: 10,
      currency: 'usd',
      status: 'succeeded'
    });
    expect(mockRetrieve).toHaveBeenCalledWith('test_payment_intent_id');
  });

  // Add more tests for capturePayment and handleWebhook
});
