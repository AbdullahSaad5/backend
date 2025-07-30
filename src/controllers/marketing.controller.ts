import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { MarketingService } from "../modules/marketing/marketing.service";
import {
  sendSmsSchema,
  sendEmailSchema,
  createCampaignSchema,
  subscribeNewsletterSchema,
} from "../contracts/marketing.contract";

const marketingService = new MarketingService();

export const marketingController = {
  // UC-17.1: Send/Reply to SMS from System
  sendSms: async (req: Request, res: Response) => {
    try {
      const { to, message } = sendSmsSchema.parse(req.body);
      const sms = await marketingService.sendSms(to, message);
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "SMS sent successfully",
        data: sms,
      });
    } catch (error: any) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error: error.message,
      });
    }
  },

  // UC-17.3: Maintain SMS History
  getSmsHistory: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const history = await marketingService.getSmsHistory(userId);
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: history,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  },

  // UC-17.4: Send/Reply to Email from System
  sendEmail: async (req: Request, res: Response) => {
    try {
      const { to, subject, body } = sendEmailSchema.parse(req.body);
      const email = await marketingService.sendEmail(to, subject, body);
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Email sent successfully",
        data: email,
      });
    } catch (error: any) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error: error.message,
      });
    }
  },

  // UC-17.6: Maintain Email Thread History
  getEmailHistory: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const history = await marketingService.getEmailHistory(userId);
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: history,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  },

  // UC-17.7: Automated Email/SMS Marketing
  createCampaign: async (req: Request, res: Response) => {
    try {
      const { name, subject, message, recipients } = createCampaignSchema.parse(req.body);
      const campaign = await marketingService.createCampaign(name, subject, message, recipients);
      res.status(StatusCodes.CREATED).json({
        status: StatusCodes.CREATED,
        message: "Campaign created successfully",
        data: campaign,
      });
    } catch (error: any) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error: error.message,
      });
    }
  },

  getCampaigns: async (req: Request, res: Response) => {
    try {
      const campaigns = await marketingService.getCampaigns();
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: campaigns,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  },

  // UC-17.10: Newsletter Management
  subscribeToNewsletter: async (req: Request, res: Response) => {
    try {
      const { email } = subscribeNewsletterSchema.parse(req.body);
      const subscriber = await marketingService.subscribeToNewsletter(email);
      res.status(StatusCodes.CREATED).json({
        status: StatusCodes.CREATED,
        message: "Subscribed to newsletter successfully",
        data: subscriber,
      });
    } catch (error: any) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error: error.message,
      });
    }
  },

  getSubscribers: async (req: Request, res: Response) => {
    try {
      const subscribers = await marketingService.getSubscribers();
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: subscribers,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  },
};
