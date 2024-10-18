import { UniPayError } from './errors.js';

export const handleWebhook = (gatewayName, requestData) => {
  switch (gatewayName.toLowerCase()) {
    case "stripe":
      return verifyStripeWebhook(requestData);
    case "razorpay":
      return verifyRazorpayWebhook(requestData);
    default:
      throw new UniPayError(`Webhook handling for ${gatewayName} not implemented`);
  }
};

// Stripe webhook verification
const verifyStripeWebhook = (requestData) => {
  try {
    const stripe = new StripeGateway({ apiKey: process.env.STRIPE_API_KEY });
    const sigHeader = requestData.headers["stripe-signature"];
    return stripe.verifyWebhook(
      requestData.body,
      sigHeader,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    throw new UniPayError(`Stripe Webhook Verification Error: ${error.message}`);
  }
};

// Razorpay webhook verification
const verifyRazorpayWebhook = (requestData) => {
  try {
    const razorpay = new RazorpayGateway({
      apiKey: process.env.RAZORPAY_API_KEY,
    });
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(requestData.body)
      .digest("hex");
    if (generatedSignature === requestData.headers["x-razorpay-signature"]) {
      return requestData.body;
    } else {
      throw new UniPayError("Invalid Razorpay signature");
    }
  } catch (error) {
    throw new UniPayError(`Razorpay Webhook Verification Error: ${error.message}`);
  }
};

export const createPaymentGateway = (gatewayName, credentials) => {
  switch (gatewayName.toLowerCase()) {
    case "stripe":
      return new StripeGateway(credentials);
    case "razorpay":
      return new RazorpayGateway(credentials);
    default:
      throw new UniPayError(`Payment gateway ${gatewayName} not supported`);
  }
};
