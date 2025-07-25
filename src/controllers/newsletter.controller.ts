
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { NewsletterService } from "@/services/newsletter.service";

export const NewsletterController = {
  subscribe: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Email is required"
        });
      }

      const existingSubscription = await NewsletterService.getSubscriptionByEmail(email);
      if (existingSubscription) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "This email is already subscribed"
        });
      }

      const newSubscription = await NewsletterService.subscribe(email);

      res.status(StatusCodes.CREATED).json({ 
        success: true, 
        message: "Subscribed successfully", 
        data: newSubscription 
      });
    } catch (error: any) {
      if (error.name === "ValidationError") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: error.message
        });
      }
      console.error("Subscription error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Subscription failed" 
      });
    }
  },

updateSubscription: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { email, isBlocked } = req.body;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Subscription ID is required"
        });
      }

      // Check if at least one field is provided
      if (email === undefined && isBlocked === undefined) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "At least one field (email or isBlocked) must be provided"
        });
      }

      const updateData: { email?: string; isBlocked?: boolean } = {};
      
      // Only add email to update if it's provided
      if (email !== undefined) {
        updateData.email = email;
      }
      
      // Only add isBlocked to update if it's provided
      if (isBlocked !== undefined) {
        updateData.isBlocked = isBlocked;
      }

      const updatedSubscription = await NewsletterService.updateSubscription(id, updateData);

      if (!updatedSubscription) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Subscription not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Subscription updated", 
        data: updatedSubscription 
      });
    } catch (error: any) {
      if (error.name === "ValidationError") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: error.message
        });
      }
      console.error("Update error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Update failed" 
      });
    }
  },

  unsubscribe: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const deletedSubscription = await NewsletterService.unsubscribe(id);

      if (!deletedSubscription) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Subscription not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Unsubscribed successfully" 
      });
    } catch (error) {
      console.error("Unsubscribe error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Unsubscribe failed" 
      });
    }
  },

  getAllSubscriptions: async (req: Request, res: Response) => {
    try {
      const { isBlocked } = req.query;
      
      const filter: { isBlocked?: boolean } = {};
      if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true';

      const subscriptions = await NewsletterService.getAllSubscriptions(filter.isBlocked);

      res.status(StatusCodes.OK).json({ 
        success: true, 
        count: subscriptions.length,
        data: subscriptions 
      });
    } catch (error) {
      console.error("Fetch error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Failed to fetch subscriptions" 
      });
    }
  },

  getSubscription: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const subscription = await NewsletterService.getSubscriptionById(id);

      if (!subscription) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Subscription not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: subscription 
      });
    } catch (error) {
      console.error("Fetch error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Failed to fetch subscription" 
      });
    }
  }
};