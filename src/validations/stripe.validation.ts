import { getZodErrors } from "@/utils/get-zod-errors.util";
import { NextFunction, Response, Request } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { z, ZodSchema } from "zod";
import { IBodyRequest, IContextRequest, IUserRequest } from "@/contracts/request.contract";
import {
  CreateSubscriptionPayload,
  CancelSubscriptionPayload,
  CreatePortalSessionPayload,
  CreatePaymentIntentPayload,
} from "@/contracts/stripe.contract";

export const stripeValidation = {
  // Create subscription validation
  createSubscription: async (req: IBodyRequest<CreateSubscriptionPayload>, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      priceId: z.string().trim().min(1, "Price ID is required"),
      customerId: z.string().trim().optional(),
      metadata: z.record(z.string()).optional(),
    });

    try {
      const validatedData = schema.parse(req.body);
      Object.assign(req.body, validatedData);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },

  // Cancel subscription validation
  cancelSubscription: async (req: IBodyRequest<CancelSubscriptionPayload>, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      subscriptionId: z.string().trim().min(1, "Subscription ID is required"),
      atPeriodEnd: z.boolean().optional().default(false),
    });

    try {
      const validatedData = schema.parse(req.body);
      Object.assign(req.body, validatedData);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },

  // Create portal session validation
  createPortalSession: async (req: IBodyRequest<CreatePortalSessionPayload>, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      customerId: z.string().trim().min(1, "Customer ID is required"),
      returnUrl: z.string().trim().url("Return URL must be a valid URL"),
    });

    try {
      const validatedData = schema.parse(req.body);
      Object.assign(req.body, validatedData);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },

  // Validate Stripe ID parameter
  validateStripeId: async (req: Request, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      id: z.string().trim().min(1, "Stripe ID is required"),
    });

    try {
      const validatedData = schema.parse(req.params);
      Object.assign(req.params, validatedData);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },

  // Validate customer ID parameter
  validateCustomerId: async (req: Request, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      customerId: z.string().trim().min(1, "Customer ID is required"),
    });

    try {
      const validatedData = schema.parse(req.params);
      Object.assign(req.params, validatedData);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },

  // Create customer validation
  createCustomer: async (
    req: IBodyRequest<{ email: string; name?: string; metadata?: Record<string, string> }>,
    res: Response,
    next: NextFunction
  ) => {
    const schema: ZodSchema = z.object({
      email: z.string().trim().email("Valid email is required"),
      name: z.string().trim().optional(),
      metadata: z.record(z.string()).optional(),
    });

    try {
      const validatedData = schema.parse(req.body);
      Object.assign(req.body, validatedData);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },

  // Create payment intent validation
  createPaymentIntent: async (req: IBodyRequest<CreatePaymentIntentPayload>, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      amount: z.number().int().positive("Amount must be a positive integer"),
      currency: z
        .string()
        .trim()
        .min(3, "Currency must be a 3-letter ISO code")
        .max(3, "Currency must be a 3-letter ISO code"),
      customerId: z.string().trim().optional(),
      paymentMethodTypes: z.array(z.string()).optional(),
      description: z.string().trim().optional(),
      metadata: z.record(z.string()).optional(),
      automaticPaymentMethods: z
        .object({
          enabled: z.boolean(),
          allow_redirects: z.enum(["always", "never"]).optional(),
        })
        .optional(),
      idempotencyKey: z.string().trim().optional(),
    });

    try {
      const validatedData = schema.parse(req.body);
      Object.assign(req.body, validatedData);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },

  // Create payment intent with order validation
  createPaymentIntentWithOrder: async (
    req: IBodyRequest<CreatePaymentIntentPayload>,
    res: Response,
    next: NextFunction
  ) => {
    const shippingAddressSchema = z.object({
      line1: z.string().trim().min(1, "Address line 1 is required"),
      line2: z.string().trim().optional(),
      city: z.string().trim().min(1, "City is required"),
      state: z.string().trim().min(1, "State is required"),
      postalCode: z.string().trim().min(1, "Postal code is required"), // Changed from postal_code to postalCode
      country: z.string().trim().min(2, "Country code is required"),
      name: z.string().trim().min(1, "Name is required"),
    });

    const billingAddressSchema = z.object({
      line1: z.string().trim().min(1, "Billing address line 1 is required"),
      line2: z.string().trim().optional(),
      city: z.string().trim().min(1, "Billing city is required"),
      state: z.string().trim().min(1, "Billing state is required"),
      postalCode: z.string().trim().min(1, "Billing postal code is required"), // Changed from postal_code to postalCode
      country: z.string().trim().min(2, "Billing country code is required"),
      name: z.string().trim().min(1, "Billing name is required"), // Added required name field
    });

    const orderDataSchema = z.object({
      customerEmail: z.string().trim().email("Valid customer email is required"),
      items: z
        .array(
          z.object({
            productId: z.string().trim().min(1, "Product ID is required"),
            quantity: z.number().int().positive("Quantity must be positive"),
            price: z.number().positive("Price must be positive"),
            name: z.string().trim().min(1, "Product name is required"), // Changed from title to name
            description: z.string().trim().optional(), // Added optional description field
          })
        )
        .min(1, "At least one item is required"),
      shippingAddress: shippingAddressSchema,
      billingAddress: billingAddressSchema,
      customerPhone: z.string().trim().optional(), // Added optional customerPhone field
      notes: z.string().trim().optional(),
    });

    const schema: ZodSchema = z.object({
      amount: z.number().int().positive("Amount must be a positive integer"),
      currency: z
        .string()
        .trim()
        .min(3, "Currency must be a 3-letter ISO code")
        .max(3, "Currency must be a 3-letter ISO code"),
      customerId: z.string().trim().optional(),
      paymentMethodTypes: z.array(z.string()).optional(),
      description: z.string().trim().optional(),
      metadata: z.record(z.string()).optional(),
      automaticPaymentMethods: z
        .object({
          enabled: z.boolean(),
          allow_redirects: z.enum(["always", "never"]).optional(),
        })
        .optional(),
      idempotencyKey: z.string().trim().optional(),
      orderData: orderDataSchema,
    });

    try {
      const validatedData = schema.parse(req.body);
      Object.assign(req.body, validatedData);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);

        // Enhanced logging for debugging validation failures
        console.log("=================== VALIDATION FAILURE ===================");
        console.log("Endpoint: createPaymentIntentWithOrder");
        console.log("Request Body:", JSON.stringify(req.body, null, 2));
        console.log("Validation Error Message:", message);
        console.log("Validation Issues:", JSON.stringify(issues, null, 2));
        console.log("Zod Error Details:", JSON.stringify(error.errors, null, 2));
        console.log("==========================================================");

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        console.log("=================== NON-ZOD VALIDATION ERROR ===================");
        console.log("Endpoint: createPaymentIntentWithOrder");
        console.log("Request Body:", JSON.stringify(req.body, null, 2));
        console.log("Error:", error);
        console.log("================================================================");

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },
};
