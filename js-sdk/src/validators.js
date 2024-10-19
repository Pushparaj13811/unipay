import Joi from "joi";
import { UniPayError } from "./errors.js";

// Define the schema for payment data
const paymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().required(),
  description: Joi.string().optional(),
  customerEmail: Joi.string().email().required(),
  customerPhone: Joi.string().optional(),
  // Extend schema with more fields as needed
});

// Define the schema for webhook data
const webhookSchema = Joi.object({
  eventType: Joi.string().required(),
  payload: Joi.object().required(),
  signature: Joi.string().required(),
  // Extend schema with more fields as needed
});

const refundSchema = Joi.object({
  transactionId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  merchandtOrderId: Joi.string().required(),
  reason: Joi.string().optional(),
  // Extend schema with more fields as needed
});
function validatePaymentData(gatewayName, paymentData) {
  const { error } = paymentSchema.validate(paymentData);
  if (error) {
    throw new UniPayError(
      `Invalid payment data for ${gatewayName}: ${error.message}`
    );
  }
}

function validateWebhook(gatewayName, webhookData) {
  const { error } = webhookSchema.validate(webhookData);
  if (error) {
    throw new UniPayError(
      `Invalid webhook data for ${gatewayName}: ${error.message}`
    );
  }
}

function validateRefundData(gatewayName, refundData) {
  const { error } = refundSchema.validate(refundData);
  if (error) {
    throw new UniPayError(
      `Invalid refund data for ${gatewayName}: ${error.message}`
    );
  }
}

function validateGatewayCredentials(gatewayName, credentials) {
  const credentialSchemas = {
    stripe: Joi.object({
      apiKey: Joi.string().required(),
    }),
    razorpay: Joi.object({
      apiKey: Joi.string().required(),
      apiSecret: Joi.string().required(),
    }),
    cashfree: Joi.object({
      apiKey: Joi.string().required(),
      apiSecret: Joi.string().required(),
      environment: Joi.string()
        .valid("sandbox", "production")
        .default("sandbox"),
    }),
    square: Joi.object({
      accessToken: Joi.string().required(),
      environment: Joi.string()
        .valid("sandbox", "production")
        .default("sandbox"),
    }),
    payu: Joi.object({
      merchantKey: Joi.string().required(),
      merchantSalt: Joi.string().required(),
      environment: Joi.string()
        .valid("sandbox", "production")
        .default("sandbox"),
    }),

    // Add more gateway credential schemas as needed
  };

  const schema = credentialSchemas[gatewayName.toLowerCase()];
  if (!schema) {
    throw new UniPayError(`Unsupported gateway: ${gatewayName}`);
  }

  const { error } = schema.validate(credentials);
  if (error) {
    throw new UniPayError(
      `Invalid credentials for ${gatewayName}: ${error.message}`
    );
  }
}

// Export all functions and schemas in export {} format
export {
  validatePaymentData,
  validateWebhook,
  validateRefundData,
  validateGatewayCredentials,
};
