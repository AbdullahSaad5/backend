import Stripe from "stripe";
import {
  CreateSubscriptionPayload,
  CancelSubscriptionPayload,
  CreatePortalSessionPayload,
  CreatePaymentIntentPayload,
  ISubscription,
} from "@/contracts/stripe.contract";
import { pendingOrderService } from "@/services/pending-order.service";
import { CreatePendingOrderPayload } from "@/contracts/pending-order.contract";
import { stripeLogger } from "@/utils/stripe-logger.util";

const getStripeInstance = (): Stripe => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

export const stripeService = {
  /**
   * Create a new subscription for a customer
   */
  createSubscription: async (payload: CreateSubscriptionPayload): Promise<Stripe.Subscription> => {
    const stripe = getStripeInstance();

    if (!payload.customerId) {
      throw new Error("Customer ID is required to create a subscription");
    }

    const subscription = await stripe.subscriptions.create({
      customer: payload.customerId,
      items: [{ price: payload.priceId }],
      metadata: payload.metadata || {},
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    return subscription;
  },

  /**
   * Cancel a subscription
   */
  cancelSubscription: async (payload: CancelSubscriptionPayload): Promise<Stripe.Subscription> => {
    const stripe = getStripeInstance();

    if (payload.atPeriodEnd) {
      return await stripe.subscriptions.update(payload.subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return await stripe.subscriptions.cancel(payload.subscriptionId);
    }
  },

  /**
   * List all subscriptions for a customer
   */
  listSubscriptions: async (customerId: string): Promise<Stripe.Subscription[]> => {
    const stripe = getStripeInstance();

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      expand: ["data.default_payment_method"],
    });

    return subscriptions.data;
  },

  /**
   * Get a specific subscription by ID
   */
  getSubscription: async (subscriptionId: string): Promise<Stripe.Subscription> => {
    const stripe = getStripeInstance();

    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["default_payment_method", "latest_invoice.payment_intent"],
    });
  },

  /**
   * Create a customer portal session
   */
  createPortalSession: async (payload: CreatePortalSessionPayload): Promise<Stripe.BillingPortal.Session> => {
    const stripe = getStripeInstance();

    return await stripe.billingPortal.sessions.create({
      customer: payload.customerId,
      return_url: payload.returnUrl,
    });
  },

  /**
   * Create a payment intent and corresponding pending order
   */
  createPaymentIntent: async (
    payload: CreatePaymentIntentPayload & {
      orderData?: CreatePendingOrderPayload["orderData"];
      expirationMinutes?: number;
    }
  ): Promise<{
    paymentIntent: Stripe.PaymentIntent;
    pendingOrder: any;
  }> => {
    const stripe = getStripeInstance();

    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount: payload.amount,
      currency: payload.currency,
      description: payload.description,
      metadata: payload.metadata || {},
    };

    // Add customer if provided
    if (payload.customerId) {
      paymentIntentData.customer = payload.customerId;
    }

    // Add payment method types if provided, otherwise use automatic payment methods
    if (payload.paymentMethodTypes && payload.paymentMethodTypes.length > 0) {
      paymentIntentData.payment_method_types = payload.paymentMethodTypes;
    } else if (payload.automaticPaymentMethods) {
      paymentIntentData.automatic_payment_methods = payload.automaticPaymentMethods;
    } else {
      // Default to automatic payment methods
      paymentIntentData.automatic_payment_methods = {
        enabled: true,
      };
    }

    // Add idempotency key if provided to prevent duplicate charges
    let paymentIntent: Stripe.PaymentIntent;
    if (payload.idempotencyKey) {
      paymentIntent = await stripe.paymentIntents.create(paymentIntentData, {
        idempotencyKey: payload.idempotencyKey,
      });
    } else {
      paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
    }

    // Log payment intent creation
    stripeLogger.paymentIntentCreated(
      paymentIntent.id,
      paymentIntent.amount,
      paymentIntent.currency,
      paymentIntent.customer as string
    );

    // Create corresponding pending order
    const pendingOrderPayload: CreatePendingOrderPayload = {
      paymentIntentId: paymentIntent.id,
      customerId: payload.customerId,
      stripeCustomerId: paymentIntent.customer as string,
      amount: payload.amount,
      currency: payload.currency,
      description: payload.description,
      metadata: payload.metadata,
      orderData: payload.orderData,
      expirationMinutes: payload.expirationMinutes,
    };

    const pendingOrder = await pendingOrderService.createPendingOrder(pendingOrderPayload);

    return {
      paymentIntent,
      pendingOrder,
    };
  },

  /**
   * Create a new customer
   */
  createCustomer: async (email: string, name?: string, metadata?: Record<string, string>): Promise<Stripe.Customer> => {
    const stripe = getStripeInstance();

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: metadata || {},
    });

    // Log customer creation
    stripeLogger.customerCreated(customer.id, email);

    return customer;
  },

  /**
   * Get customer by ID
   */
  getCustomer: async (customerId: string): Promise<Stripe.Customer> => {
    const stripe = getStripeInstance();

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      throw new Error("Customer has been deleted");
    }
    return customer as Stripe.Customer;
  },

  /**
   * Update customer
   */
  updateCustomer: async (customerId: string, data: Stripe.CustomerUpdateParams): Promise<Stripe.Customer> => {
    const stripe = getStripeInstance();

    return await stripe.customers.update(customerId, data);
  },

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature: (payload: string | Buffer, signature: string): Stripe.Event => {
    const stripe = getStripeInstance();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  },
};
