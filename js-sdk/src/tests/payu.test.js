import PayUGateway from '../gateways/payu';
import axios from 'axios';
import crypto from 'crypto';

jest.mock('axios');
jest.mock('crypto');

describe('PayUGateway', () => {
  let gateway;

  beforeEach(() => {
    gateway = new PayUGateway({
      merchantKey: 'test_merchant_key',
      merchantSalt: 'test_merchant_salt',
      environment: 'sandbox'
    });
  });

  test('processPayment should create payment parameters', async () => {
    crypto.createHash().update().digest = jest.fn().mockReturnValue('test_hash');

    const result = await gateway.processPayment({
      amount: 10,
      productInfo: 'Test Product',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '1234567890',
      successUrl: 'https://example.com/success',
      failureUrl: 'https://example.com/failure'
    });

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('amount', 10);
    expect(result).toHaveProperty('currency', 'INR');
    expect(result).toHaveProperty('paymentUrl');
    expect(result).toHaveProperty('paymentParams');
    expect(result.paymentParams).toHaveProperty('hash', 'test_hash');
  });

  test('getPaymentStatus should retrieve payment status', async () => {
    axios.post.mockResolvedValue({
      data: {
        transaction_details: {
          test_payment_id: {
            txnid: 'test_payment_id',
            amt: '10.00',
            status: 'success'
          }
        }
      }
    });

    const result = await gateway.getPaymentStatus('test_payment_id');

    expect(result).toEqual({
      id: 'test_payment_id',
      amount: '10.00',
      status: 'success'
    });
    expect(axios.post).toHaveBeenCalled();
  });

  // Add more tests for handleWebhook when implemented
});
