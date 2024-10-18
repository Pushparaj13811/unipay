import RazorpayGateway from "../gateways/razorpay";
import { UniPayError } from "../errors";

jest.mock("razorpay");

describe("RazorpayGateway", () => {
  let gateway;

  beforeEach(() => {
    gateway = new RazorpayGateway({
      apiKey: "test_api_key",
      apiSecret: "test_api_secret",
    });
  });

  test("processPayment should create an order", async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      id: "test_order_id",
      amount: 1000,
      currency: "INR",
      receipt: "test_receipt",
    });
    gateway.instance.orders.create = mockCreate;

    const result = await gateway.processPayment({
      amount: 10,
      currency: "INR",
      receipt: "test_receipt",
      customerEmail: "test@example.com",
      customerPhone: "1234567890",
      description: "Test payment",
    });

    expect(result).toEqual({
      id: "test_order_id",
      amount: 10,
      currency: "INR",
      receipt: "test_receipt",
    });
    expect(mockCreate).toHaveBeenCalled();
  });

  test("getPaymentStatus should retrieve payment status", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      id: "test_payment_id",
      amount: 1000,
      currency: "INR",
      status: "captured",
    });
    gateway.instance.payments.fetch = mockFetch;

    const result = await gateway.getPaymentStatus("test_payment_id");

    expect(result).toEqual({
      id: "test_payment_id",
      amount: 10,
      currency: "INR",
      status: "captured",
    });
    expect(mockFetch).toHaveBeenCalledWith("test_payment_id");
  });

  // Add more tests for capturePayment and handleWebhook
});
