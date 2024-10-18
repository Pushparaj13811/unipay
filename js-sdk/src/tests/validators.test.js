import {
  validatePaymentData,
  validateWebhook,
  validateGatewayCredentials,
} from "../validators.js";
import { UniPayError } from "../errors.js";

describe("Validators", () => {
  describe("validatePaymentData", () => {
    it("should not throw for valid payment data", () => {
      const validPaymentData = {
        amount: 100,
        currency: "USD",
        description: "Test payment",
        customerEmail: "test@example.com",
        customerPhone: "1234567890",
      };
      expect(() =>
        validatePaymentData("stripe", validPaymentData)
      ).not.toThrow();
    });

    it("should throw for invalid payment data", () => {
      const invalidPaymentData = {
        amount: -100,
        currency: "USD",
        customerEmail: "invalid-email",
      };
      expect(() => validatePaymentData("stripe", invalidPaymentData)).toThrow(
        UniPayError
      );
    });
  });

  describe("validateWebhook", () => {
    it("should not throw for valid webhook data", () => {
      const validWebhookData = {
        eventType: "payment.success",
        payload: { id: "pay_123" },
        signature: "valid-signature",
      };
      expect(() => validateWebhook("stripe", validWebhookData)).not.toThrow();
    });

    it("should throw for invalid webhook data", () => {
      const invalidWebhookData = {
        eventType: "payment.success",
        payload: { id: "pay_123" },
      };
      expect(() => validateWebhook("stripe", invalidWebhookData)).toThrow(
        UniPayError
      );
    });
  });

  describe("validateGatewayCredentials", () => {
    it("should not throw for valid Stripe credentials", () => {
      const validCredentials = { apiKey: "sk_test_1234" };
      expect(() =>
        validateGatewayCredentials("stripe", validCredentials)
      ).not.toThrow();
    });

    it("should throw for invalid Stripe credentials", () => {
      const invalidCredentials = {};
      expect(() =>
        validateGatewayCredentials("stripe", invalidCredentials)
      ).toThrow(UniPayError);
    });

    it("should throw for unsupported gateway", () => {
      expect(() => validateGatewayCredentials("unsupported", {})).toThrow(
        UniPayError
      );
    });
  });
});
