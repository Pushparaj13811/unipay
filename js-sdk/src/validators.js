'use strict';

const Joi = require('joi');
const UniPayError = require('./errors');

const paymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().required(),
  description: Joi.string().optional(),
  customerEmail: Joi.string().email().required(),
  customerPhone: Joi.string().optional()
  // Extend schema with more fields as needed
});

const webhookSchema = Joi.object({
  eventType: Joi.string().required(),
  payload: Joi.object().required(),
  signature: Joi.string().required()
  // Extend schema with more fields as needed
});

function validatePaymentData(gateway, paymentData) {
  const { error } = paymentSchema.validate(paymentData);
  if (error) {
    throw new UniPayError.PaymentError(`Invalid payment data for ${gateway}: ${error.message}`);
  }
}

function validateWebhook(gateway, webhookData) {
  const { error } = webhookSchema.validate(webhookData);
  if (error) {
    throw new UniPayError.WebhookError(`Invalid webhook data for ${gateway}: ${error.message}`);
  }
}

module.exports = {
  validatePaymentData,
  validateWebhook
};
