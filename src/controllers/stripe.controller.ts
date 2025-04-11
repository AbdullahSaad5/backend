import { IContextRequest, IUserRequest } from "@/contracts/request.contract";
import { Request, Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import Stripe from "stripe";

const handleError = (res: Response, error: unknown) => {
  console.error("Stripe API Error:", error);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    status: StatusCodes.INTERNAL_SERVER_ERROR,
    message: ReasonPhrases.INTERNAL_SERVER_ERROR,
    error: error instanceof Error ? error.message : "An unknown error occurred",
  });
};

const getStripeInstance = () => {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
};

export const stripeController = {
  createSubscription: async (req: IContextRequest<IUserRequest>, res: Response) => {},

  cancelSubscription: async (req: IContextRequest<IUserRequest>, res: Response) => {},

  listSubscriptions: async (req: IContextRequest<IUserRequest>, res: Response) => {},

  createPortalSession: async (req: IContextRequest<IUserRequest>, res: Response) => {},

  webhookHandler: async (req: Request, res: Response) => {},

  sendSocketEvent: async (stripeCustomerId: string, event: string, eventCode?: string) => {},
};
