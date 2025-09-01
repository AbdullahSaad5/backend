import { Router } from "express";
import { stripeController } from "@/controllers/stripe.controller";
import { stripeValidation } from "@/validations/stripe.validation";
import {
  stripeRateLimit,
  paymentIntentRateLimit,
  webhookRateLimit,
  stripeSecurityHeaders,
  stripeSizeLimit,
  detectSuspiciousActivity,
  stripeCors,
  validateWebhookIP,
  logStripeRequest,
} from "@/middlewares/stripe-security.middleware";

export const stripe = (router: Router) => {
  // Apply security middleware to all Stripe routes
  router.use("/stripe", stripeCors);
  router.use("/stripe", stripeSecurityHeaders);
  router.use("/stripe", stripeSizeLimit);
  router.use("/stripe", logStripeRequest);
  router.use("/stripe", detectSuspiciousActivity);

  // Subscription routes
  router.post(
    "/subscriptions",
    stripeRateLimit,
    stripeValidation.createSubscription,
    stripeController.createSubscription
  );

  router.patch(
    "/subscriptions/cancel",
    stripeRateLimit,
    stripeValidation.cancelSubscription,
    stripeController.cancelSubscription
  );

  router.get(
    "/subscriptions/customer/:customerId",
    stripeRateLimit,
    stripeValidation.validateCustomerId,
    stripeController.listSubscriptions
  );

  router.get(
    "/subscriptions/:id",
    stripeRateLimit,
    stripeValidation.validateStripeId,
    stripeController.getSubscription
  );

  // Customer routes
  router.post("/customers", stripeRateLimit, stripeValidation.createCustomer, stripeController.createCustomer);

  router.get(
    "/customers/:customerId",
    stripeRateLimit,
    stripeValidation.validateCustomerId,
    stripeController.getCustomer
  );

  // Portal session route
  router.post(
    "/portal-session",
    stripeRateLimit,
    stripeValidation.createPortalSession,
    stripeController.createPortalSession
  );

  // Payment intent route (with stricter rate limiting)
  router.post(
    "/payment-intent",
    paymentIntentRateLimit,
    stripeValidation.createPaymentIntent,
    stripeController.createPaymentIntent
  );

  // Payment intent with immediate order creation (RECOMMENDED)
  router.post(
    "/payment-intent-with-order",
    paymentIntentRateLimit,
    stripeValidation.createPaymentIntentWithOrder,
    stripeController.createPaymentIntentWithOrder
  );

  // Webhook route (no auth required, but with webhook-specific security)
  // Raw body parsing is handled globally in index.ts for /api/stripe/webhook
  router.post(
    "/webhook",
    webhookRateLimit,
    validateWebhookIP,
    stripeController.webhookHandler
  );
};
