import { IContextRequest, IUserRequest, IBodyRequest } from "@/contracts/request.contract";
import { Request, Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import { stripeService } from "@/services/stripe.service";
import { pendingOrderService } from "@/services/pending-order.service";
import { orderService } from "@/services/order.service";
import { stripeLogger } from "@/utils/stripe-logger.util";
import {
  CreateSubscriptionPayload,
  CancelSubscriptionPayload,
  CreatePortalSessionPayload,
  CreatePaymentIntentPayload,
  StripeWebhookEvent,
} from "@/contracts/stripe.contract";

const handleError = (res: Response, error: unknown) => {
  console.error("Stripe API Error:", error);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    status: StatusCodes.INTERNAL_SERVER_ERROR,
    message: ReasonPhrases.INTERNAL_SERVER_ERROR,
    error: error instanceof Error ? error.message : "An unknown error occurred",
  });
};

export const stripeController = {
  createSubscription: async (req: IBodyRequest<CreateSubscriptionPayload>, res: Response) => {
    try {
      const subscription = await stripeService.createSubscription(req.body);

      res.status(StatusCodes.CREATED).json({
        status: StatusCodes.CREATED,
        message: "Subscription created successfully",
        data: subscription,
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  cancelSubscription: async (req: IBodyRequest<CancelSubscriptionPayload>, res: Response) => {
    try {
      const subscription = await stripeService.cancelSubscription(req.body);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Subscription cancelled successfully",
        data: subscription,
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  listSubscriptions: async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const subscriptions = await stripeService.listSubscriptions(customerId);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Subscriptions retrieved successfully",
        data: subscriptions,
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  getSubscription: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subscription = await stripeService.getSubscription(id);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Subscription retrieved successfully",
        data: subscription,
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  createPortalSession: async (req: IBodyRequest<CreatePortalSessionPayload>, res: Response) => {
    try {
      const session = await stripeService.createPortalSession(req.body);

      res.status(StatusCodes.CREATED).json({
        status: StatusCodes.CREATED,
        message: "Portal session created successfully",
        data: { url: session.url },
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  createPaymentIntent: async (req: IBodyRequest<CreatePaymentIntentPayload>, res: Response) => {
    try {
      const result = await stripeService.createPaymentIntent(req.body);

      res.status(StatusCodes.CREATED).json({
        status: StatusCodes.CREATED,
        message: "Payment intent created successfully",
        data: {
          clientSecret: result.paymentIntent.client_secret,
          paymentIntentId: result.paymentIntent.id,
          status: result.paymentIntent.status,
          amount: result.paymentIntent.amount,
          currency: result.paymentIntent.currency,
          orderId: result.pendingOrder.orderId,
          expiresAt: result.pendingOrder.expiresAt,
        },
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  /**
   * Create payment intent and order immediately
   * This ensures order is created before payment processing
   */
  createPaymentIntentWithOrder: async (req: IBodyRequest<CreatePaymentIntentPayload>, res: Response) => {
    try {
      // First create the payment intent and pending order
      const result = await stripeService.createPaymentIntent(req.body);

      // Immediately create the actual order with PENDING_PAYMENT status
      const pendingOrder = result.pendingOrder;
      const createdOrder = await stripeController.createOrderFromPendingOrder(pendingOrder);

      // Log the order creation
      stripeLogger.orderCreated(
        createdOrder.orderId,
        result.paymentIntent.id,
        result.paymentIntent.amount,
        result.paymentIntent.customer as string
      );

      res.status(StatusCodes.CREATED).json({
        status: StatusCodes.CREATED,
        message: "Payment intent and order created successfully",
        data: {
          clientSecret: result.paymentIntent.client_secret,
          paymentIntentId: result.paymentIntent.id,
          status: result.paymentIntent.status,
          amount: result.paymentIntent.amount,
          currency: result.paymentIntent.currency,
          orderId: createdOrder.orderId,
          orderNumber: createdOrder.orderNumber,
          orderStatus: createdOrder.status,
          paymentStatus: createdOrder.paymentStatus,
        },
      });
    } catch (error) {
      stripeLogger.orderCreationFailed(req.body.description || "unknown", error as Error, req.body.customerId);
      handleError(res, error);
    }
  },

  createCustomer: async (
    req: IBodyRequest<{ email: string; name?: string; metadata?: Record<string, string> }>,
    res: Response
  ) => {
    try {
      const { email, name, metadata } = req.body;
      const customer = await stripeService.createCustomer(email, name, metadata);

      res.status(StatusCodes.CREATED).json({
        status: StatusCodes.CREATED,
        message: "Customer created successfully",
        data: customer,
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  getCustomer: async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const customer = await stripeService.getCustomer(customerId);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Customer retrieved successfully",
        data: customer,
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  /**
   * Convert pending order to actual order
   */
  createOrderFromPendingOrder: async (pendingOrder: any, initialStatus: string = "PENDING_PAYMENT"): Promise<any> => {
    try {
      // Note: We'll store both MongoDB customer reference (if found) and Stripe customer ID
      const customerEmail = pendingOrder.orderData?.customerEmail;
      let customerObjectId = null;

      // Try to find an existing user by email
      if (customerEmail) {
        try {
          // Import User model to search for existing customer
          const { User } = require("@/models/user.model");
          const existingUser = await User.findOne({ email: customerEmail }).select("_id");
          if (existingUser) {
            customerObjectId = existingUser._id;
          }
        } catch (userSearchError) {
          console.log("Could not search for existing user:", userSearchError);
        }
      }

      const orderData = {
        // Basic order info
        type: "SALE" as const,
        sourcePlatform: "STOREFRONT" as const,

        // Customer info - Include MongoDB customer ID if found, always include Stripe customer ID
        ...(customerObjectId && {
          customer: customerObjectId,
          customerId: customerObjectId,
        }),
        stripeCustomerId: pendingOrder.customerId || null, // Store Stripe customer ID
        email: customerEmail || "unknown@example.com",
        customerDetails: {
          firstName: pendingOrder.orderData?.shippingAddress?.name?.split(" ")[0] || "Unknown",
          lastName: pendingOrder.orderData?.shippingAddress?.name?.split(" ").slice(1).join(" ") || "",
          email: customerEmail || "unknown@example.com",
          phone: pendingOrder.orderData?.customerPhone || undefined,
        },

        // Order status - Dynamic based on when this is called
        status: initialStatus as any,
        paymentStatus: (initialStatus === "PENDING_PAYMENT" ? "PENDING" : "PAID") as any,
        shippingStatus: "Pending" as any,

        // Financial info
        currency: pendingOrder.currency?.toUpperCase() || "USD",
        subtotal: pendingOrder.amount / 100, // Convert from cents
        totalDiscount: 0,
        discount: 0,
        shippingCost: 0,
        shippingFee: 0,
        taxAmount: 0,
        tax: 0,
        grandTotal: pendingOrder.amount / 100, // Convert from cents

        // Payment info
        paymentMethod: "STRIPE",
        transactionId: pendingOrder.paymentIntentId,
        paymentDetails: `Stripe Payment Intent: ${pendingOrder.paymentIntentId}`,

        // Items - Fixed condition enum value
        items:
          pendingOrder.orderData?.items?.map((item: any, index: number) => ({
            itemId: `item_${index + 1}`,
            productId: item.productId || null,
            sku: item.sku || `SKU_${index + 1}`,
            name: item.name,
            description: item.description || "",
            quantity: item.quantity,
            unitPrice: item.price,
            condition: "New", // Fixed: Changed from "NEW" to "New" to match enum
            itemTotal: item.price * item.quantity,
            discountAmount: 0,
            taxAmount: 0,
            finalPrice: item.price * item.quantity,
          })) || [],

        // Products (legacy support)
        products: [],

        // Addresses
        shippingAddress: pendingOrder.orderData?.shippingAddress
          ? {
              fullName: pendingOrder.orderData.shippingAddress.name,
              street1: pendingOrder.orderData.shippingAddress.line1,
              street2: pendingOrder.orderData.shippingAddress.line2,
              city: pendingOrder.orderData.shippingAddress.city,
              stateProvince: pendingOrder.orderData.shippingAddress.state,
              postalCode: pendingOrder.orderData.shippingAddress.postalCode,
              country: pendingOrder.orderData.shippingAddress.country,
              phone: pendingOrder.orderData.customerPhone,
            }
          : {
              fullName: "Unknown Customer",
              street1: "Address not provided",
              city: "Unknown",
              stateProvince: "Unknown",
              postalCode: "00000",
              country: "US",
            },

        billingAddress: pendingOrder.orderData?.billingAddress
          ? {
              fullName: pendingOrder.orderData.billingAddress.name,
              street1: pendingOrder.orderData.billingAddress.line1,
              street2: pendingOrder.orderData.billingAddress.line2,
              city: pendingOrder.orderData.billingAddress.city,
              stateProvince: pendingOrder.orderData.billingAddress.state,
              postalCode: pendingOrder.orderData.billingAddress.postalCode,
              country: pendingOrder.orderData.billingAddress.country,
              phone: pendingOrder.orderData.customerPhone,
            }
          : undefined,

        // Dates
        orderDate: new Date(),
        placedAt: new Date(),

        // Additional fields
        isExpedited: false,
        specialInstructions: pendingOrder.description,
        discountsApplied: [],
        taskIds: [],
        suggestedTasks: [],
      };

      // Create the order using your existing order service
      const createdOrder = await orderService.createOrder(orderData);
      console.log(`✅ Created order ${createdOrder.orderId} from pending order ${pendingOrder.orderId}`);

      return createdOrder;
    } catch (error) {
      console.error("❌ Error creating order from pending order:", error);
      throw error;
    }
  },

  webhookHandler: async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const signature = req.headers["stripe-signature"] as string;

      if (!signature) {
        stripeLogger.webhookSignatureVerificationFailed("missing", "No stripe-signature header provided");
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: "Missing stripe-signature header",
        });
      }

      let event: Stripe.Event;
      try {
        event = stripeService.verifyWebhookSignature(req.body, signature);
        stripeLogger.webhookReceived(event.type, event.id);
      } catch (verificationError) {
        stripeLogger.webhookSignatureVerificationFailed(signature, verificationError as Error);
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: "Invalid webhook signature",
        });
      }

      // Handle different event types
      switch (event.type) {
        case "customer.subscription.created":
          const createdSubscription = event.data.object as Stripe.Subscription;
          stripeLogger.subscriptionCreated(
            createdSubscription.id,
            createdSubscription.customer as string,
            createdSubscription.items.data[0]?.price.id || ""
          );
          await stripeController.sendSocketEvent(createdSubscription.customer as string, "subscription.created");
          break;

        case "customer.subscription.updated":
          console.log("Subscription updated:", event.data.object);
          await stripeController.sendSocketEvent(
            (event.data.object as Stripe.Subscription).customer as string,
            "subscription.updated"
          );
          break;

        case "customer.subscription.deleted":
          const deletedSubscription = event.data.object as Stripe.Subscription;
          stripeLogger.subscriptionCanceled(deletedSubscription.id, deletedSubscription.customer as string, "deleted");
          await stripeController.sendSocketEvent(deletedSubscription.customer as string, "subscription.deleted");
          break;

        case "invoice.payment_succeeded":
          console.log("Payment succeeded:", event.data.object);
          await stripeController.sendSocketEvent(
            (event.data.object as Stripe.Invoice).customer as string,
            "payment.succeeded"
          );
          break;

        case "invoice.payment_failed":
          console.log("Payment failed:", event.data.object);
          await stripeController.sendSocketEvent(
            (event.data.object as Stripe.Invoice).customer as string,
            "payment.failed"
          );
          break;

        // Payment Intent events
        case "payment_intent.succeeded":
          const succeededPaymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`🔵 [WEBHOOK] Payment intent succeeded: ${succeededPaymentIntent.id}`);
          console.log(`🔵 [WEBHOOK] Looking for order with transactionId: ${succeededPaymentIntent.id}`);
          
          stripeLogger.paymentIntentSucceeded(
            succeededPaymentIntent.id,
            succeededPaymentIntent.amount,
            succeededPaymentIntent.currency,
            succeededPaymentIntent.customer as string
          );

          try {
            // Update pending order status
            await pendingOrderService.updatePaymentStatus(succeededPaymentIntent.id, "succeeded");
            console.log(`✅ [WEBHOOK] Updated pending order status for ${succeededPaymentIntent.id}`);

            // Find the existing order by transaction ID and update payment status
            console.log(`🔍 [WEBHOOK] Searching for order with transactionId: ${succeededPaymentIntent.id}`);
            const updatedOrder = await orderService.updatePaymentStatus(
              succeededPaymentIntent.id,
              "PAID",
              "PENDING_ADMIN_CONFIGURATION"
            );

            if (updatedOrder) {
              console.log(`✅ [WEBHOOK] Successfully found and updated order: ${updatedOrder.orderId}`);
              console.log(`✅ [WEBHOOK] Order payment status updated to: ${updatedOrder.paymentStatus}`);
              console.log(`✅ [WEBHOOK] Order status updated to: ${updatedOrder.status}`);
              
              stripeLogger.orderCreated(
                updatedOrder.orderId,
                succeededPaymentIntent.id,
                succeededPaymentIntent.amount,
                succeededPaymentIntent.customer?.toString() || ""
              );
              console.log(
                `✅ Successfully updated order ${updatedOrder.orderId} payment status for payment intent ${succeededPaymentIntent.id}`
              );

              // Optionally send confirmation email here
              // await emailService.sendOrderConfirmation(updatedOrder);
            } else {
              console.error(`❌ [WEBHOOK] No order found for payment intent ${succeededPaymentIntent.id}`);
              console.log(`🔍 [WEBHOOK] Debug: Searching all orders with transactionId containing: ${succeededPaymentIntent.id}`);
              
              // Debug: Let's check if there are any orders with similar transaction IDs
              const { Order } = require("@/models/order.model");
              const allOrdersWithTransaction = await Order.find({
                transactionId: { $regex: succeededPaymentIntent.id }
              }).select("orderId transactionId paymentStatus status").limit(5);
              console.log(`🔍 [WEBHOOK] Found ${allOrdersWithTransaction.length} orders with similar transaction IDs:`, allOrdersWithTransaction);
              
              console.warn(`⚠️ No order found for payment intent ${succeededPaymentIntent.id}`);
            }
          } catch (orderError) {
            console.error(`❌ [WEBHOOK] Error updating order for payment intent ${succeededPaymentIntent.id}:`, orderError);
            stripeLogger.orderCreationFailed(
              succeededPaymentIntent.id,
              orderError as Error,
              succeededPaymentIntent.customer as string
            );
            console.error(
              `❌ Failed to update order payment status for payment intent ${succeededPaymentIntent.id}:`,
              orderError
            );
            // Payment succeeded but order update failed
            // Log this for manual processing
          }
          break;

        case "payment_intent.payment_failed":
          const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
          stripeLogger.paymentIntentFailed(
            failedPaymentIntent.id,
            failedPaymentIntent.last_payment_error?.message || "Payment failed",
            failedPaymentIntent.amount,
            failedPaymentIntent.customer as string
          );
          try {
            await pendingOrderService.updatePaymentStatus(failedPaymentIntent.id, "canceled");
          } catch (error) {
            console.error(`Failed to update payment status for ${failedPaymentIntent.id}:`, error);
          }
          break;

        case "payment_intent.canceled":
          const canceledPaymentIntent = event.data.object as Stripe.PaymentIntent;
          stripeLogger.paymentIntentCanceled(canceledPaymentIntent.id, canceledPaymentIntent.customer as string);
          try {
            await pendingOrderService.markAsCancelled(canceledPaymentIntent.id);
          } catch (error) {
            console.error(`Failed to cancel order for ${canceledPaymentIntent.id}:`, error);
          }
          break;

        case "payment_intent.processing":
          console.log("Payment intent processing:", event.data.object);
          const processingPaymentIntent = event.data.object as Stripe.PaymentIntent;
          try {
            await pendingOrderService.updatePaymentStatus(processingPaymentIntent.id, "processing");
          } catch (error) {
            console.error(`Failed to update processing status for ${processingPaymentIntent.id}:`, error);
          }
          break;

        case "payment_intent.requires_action":
          console.log("Payment intent requires action:", event.data.object);
          const actionPaymentIntent = event.data.object as Stripe.PaymentIntent;
          try {
            await pendingOrderService.updatePaymentStatus(actionPaymentIntent.id, "requires_action");
          } catch (error) {
            console.error(`Failed to update action required status for ${actionPaymentIntent.id}:`, error);
          }
          break;

        default:
          console.log("Unhandled event type:", event.type);
      }

      const duration = Date.now() - startTime;
      stripeLogger.performanceMetric("webhook_processing", duration, true, { eventType: event.type });
      stripeLogger.webhookProcessed(event.type, event.id);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Webhook processed successfully",
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      stripeLogger.performanceMetric("webhook_processing", duration, false, { error: (error as Error).message });
      stripeLogger.webhookFailed("unknown", error as Error);
      console.error("Webhook processing error:", error);
      handleError(res, error);
    }
  },

  sendSocketEvent: async (stripeCustomerId: string, event: string, eventCode?: string) => {
    try {
      // TODO: Implement socket event emission logic
      // This would typically involve emitting to connected WebSocket clients
      // Example with socket.io:
      // io.to(`customer_${stripeCustomerId}`).emit(event, { eventCode, timestamp: new Date() });

      console.log(`Socket event sent: ${event} to customer ${stripeCustomerId}`, { eventCode });
    } catch (error) {
      console.error("Error sending socket event:", error);
    }
  },
};
