import { Request, Response } from "express";
import { EmailProcessingService } from "@/services/email-processing.service";
import { StatusCodes } from "http-status-codes";

export const MailboxController = {
  processEmail: async (req: Request, res: Response) => {
    try {
      const emailEvent = req.body;
      const result = await EmailProcessingService.processIncomingEmail(emailEvent);

      if (result.success) {
        res.status(StatusCodes.CREATED).json({ success: true, data: result.email });
      } else {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: result.error });
      }
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to process email." });
    }
  },
};

