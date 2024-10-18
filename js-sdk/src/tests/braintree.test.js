import BraintreeGateway from '../gateways/braintree';

jest.mock('braintree');

describe('BraintreeGateway', () => {
  let gateway;

  beforeEach(() => {
    gateway = new BraintreeGateway({
      environment: 'sandbox',
      merchantId: 'test_merchant_id',
      publicKey: 'test_public_key',
      privateKey: 'test_private_key'
    });
  });

  test('processPayment should create a transaction', async () => {
    const mockSale = jest.fn().mockResolvedValue({
      success: true,
      transaction: {
        id: 'test_transaction_id',
        amount: '10.00',
        currencyIsoCode: 'USD',
        status: 'authorized'
      }
    });
    gateway.gateway.transaction.sale = mockSale;

    const result = await gateway.processPayment({
      amount: 10,
      nonce: 'test_nonce',
      customerEmail: 'test@example.com'
    });

    expect(result).toEqual({
      id: 'test_transaction_id',
      amount: 10,
      currency: 'USD',
      status: 'authorized'
    });
    expect(mockSale).toHaveBeenCalled();
  });

  test('getPaymentStatus should retrieve transaction status', async () => {
    const mockFind = jest.fn().mockResolvedValue({
      id: 'test_transaction_id',
      amount: '10.00',
      currencyIsoCode: 'USD',
      status: 'settled'
    });
    gateway.gateway.transaction.find = mockFind;

    const result = await gateway.getPaymentStatus('test_transaction_id');

    expect(result).toEqual({
      id: 'test_transaction_id',
      amount: 10,
      currency: 'USD',
      status: 'settled'
    });
    expect(mockFind).toHaveBeenCalledWith('test_transaction_id');
  });

  // Add more tests for capturePayment and handleWebhook
});
