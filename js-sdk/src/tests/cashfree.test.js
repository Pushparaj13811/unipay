import CashfreeGateway from "../gateways/cashfree";
import { UniPayError } from "../errors";
import axios from "axios";

jest.mock("axios");

describe("CashfreeGateway", () => {
  let gateway;

  beforeEach(() => {
    gateway = new CashfreeGateway({
      apiKey: "test_api_key",
      apiSecret: "test_api_secret",
      environment: "sandbox",
    });
  });

  test("processPayment should create an order", async () => {
    axios.post.mockResolvedValue({
      data: {
        order_id: "test_order_id",
        order_amount: 10,
        order_currency: "INR",
        payment_link: "https://test-payment-link.com",
      },
    });

    const result = await gateway.processPayment({
      amount: 10,
      currency: "INR",
      customerId: "test_customer_id",
      customerEmail: "test@example.com",
      customerPhone: "1234567890",
      returnUrl: "https://example.com/return",
    });

    expect(result).toEqual({
      id: "test_order_id",
      amount: 10,
      currency: "INR",
      paymentLink: "https://test-payment-link.com",
    });
    expect(axios.post).toHaveBeenCalled();
  });

  test("getPaymentStatus should retrieve order status", async () => {
    axios.get.mockResolvedValue({
      data: {
        order_id: "test_order_id",
        order_amount: 10,
        order_currency: "INR",
        order_status: "PAID",
      },
    });

    const result = await gateway.getPaymentStatus("test_order_id");

    expect(result).toEqual({
      id: "test_order_id",
      amount: 10,
      currency: "INR",
      status: "PAID",
    });
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("test_order_id")
    );
  });
});
