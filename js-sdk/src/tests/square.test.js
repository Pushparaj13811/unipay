import SquareGateway from '../gateways/square';
import { UniPayError } from '../errors';
import { Client } from 'square';

jest.mock('square');

describe('SquareGateway', () => {
  let gateway;

  beforeEach(() => {
    gateway = new SquareGateway({
      accessToken: 'test_access_token',
      environment: 'sandbox'
    });
  });

  test('processPayment should create a payment', async () => {
    const mockCreatePayment = jest.fn().mockResolvedValue({
      result: {
        payment: {
          id: 'test_payment_id',
          amountMoney: {
            amount: 1000,
            currency: 'USD'
          },
          status: 'COMPLETED'
        }
      }
    });
    gateway.paymentsApi.createPayment = mockCreatePayment;

    const result = await gateway.processPayment({
      sourceId: 'test_source_id',
      amount: 10,
      currency: 'USD',
      customerId: 'test_customer_id'
    });

    expect(result).toEqual({
      id: 'test_payment_id',
      amount: 10,
      currency: 'USD',
      status: 'COMPLETED'
    });
    expect(mockCreatePayment).toHaveBeenCalled();
  });

  test('getPaymentStatus should retrieve payment status', async () => {
    const mockGetPayment = jest.fn().mockResolvedValue({
      result: {
        payment: {
          id: 'test_payment_id',
          amountMoney: {
            amount: 1000,
            currency: 'USD'
          },
          status: 'COMPLETED'
        }
      }
    });
    gateway.paymentsApi.getPayment = mockGetPayment;

    const result = await gateway.getPaymentStatus('test_payment_id');

    expect(result).toEqual({
      id: 'test_payment_id',
      amount: 10,
      currency: 'USD',
      status: 'COMPLETED'
    });
    expect(mockGetPayment).toHaveBeenCalledWith('test_payment_id');
  });

  // Add more tests for handleWebhook when implemented
});
