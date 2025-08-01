import { Request, Response } from "express";
import { EmailProcessingService } from "@/services/email-processing.service";
import { switchableEmailService } from "@/services/email-switchable.service";
import { StatusCodes } from "http-status-codes";
import { EmailModel } from "@/models/email.model";
import { EmailDirection, EmailType, EmailStatus, EmailPriority } from "@/contracts/mailbox.contract";

export const MailboxController = {
  // Process incoming email (from webhooks)
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

  // Send a single email
  sendEmail: async (req: Request, res: Response) => {
    try {
      const { to, subject, body, html, from, replyTo, cc, bcc, type = "general" } = req.body;

      if (!to || !subject || !body) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing required fields: to, subject, body",
        });
      }

      // Send email using switchable service
      const result = await switchableEmailService.sendEmail({
        to,
        subject,
        body,
        html,
        from,
        replyTo,
        cc,
        bcc,
      });

      if (result.status === "sent") {
        // Save sent email to database
        const emailData = {
          messageId: result.messageId,
          direction: EmailDirection.OUTBOUND,
          type: type as EmailType,
          status: EmailStatus.PROCESSED,
          priority: EmailPriority.NORMAL,
          subject,
          textContent: body,
          htmlContent: html || body,
          from: { email: from || switchableEmailService.getProviderConfig().config.defaultFromEmail },
          to: Array.isArray(to) ? to.map((email: string) => ({ email })) : [{ email: to }],
          cc: cc ? (Array.isArray(cc) ? cc.map((email: string) => ({ email })) : [{ email: cc }]) : [],
          bcc: bcc ? (Array.isArray(bcc) ? bcc.map((email: string) => ({ email })) : [{ email: bcc }]) : [],
          sentAt: new Date(),
          receivedAt: new Date(),
          isRead: false,
          isReplied: false,
          isForwarded: false,
          isArchived: false,
          isSpam: false,
        };

        const savedEmail = await EmailModel.create(emailData);

        res.status(StatusCodes.OK).json({
          success: true,
          message: "Email sent successfully",
          data: {
            messageId: result.messageId,
            provider: result.provider,
            email: savedEmail,
          },
        });
      } else {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Failed to send email",
          error: result.error,
          provider: result.provider,
        });
      }
    } catch (error: any) {
      console.error("Send email error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to send email",
        error: error.message,
      });
    }
  },

  // Send bulk emails
  sendBulkEmails: async (req: Request, res: Response) => {
    try {
      const { emails } = req.body;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing or invalid emails array",
        });
      }

      // Validate each email
      for (const email of emails) {
        if (!email.to || !email.subject || !email.body) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Each email must have to, subject, and body fields",
          });
        }
      }

      const results = await switchableEmailService.sendBulkEmails(emails);
      const successCount = results.filter((r) => r.status === "sent").length;
      const failedCount = results.filter((r) => r.status === "failed").length;

      res.status(StatusCodes.OK).json({
        success: true,
        message: `Bulk email sending completed. ${successCount} sent, ${failedCount} failed.`,
        data: {
          results,
          summary: {
            total: results.length,
            sent: successCount,
            failed: failedCount,
            provider: switchableEmailService.getCurrentProvider(),
          },
        },
      });
    } catch (error: any) {
      console.error("Bulk email error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to send bulk emails",
        error: error.message,
      });
    }
  },

  // Get all emails
  getEmails: async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, direction, type, status, isRead, from, to, subject } = req.query;

      const filter: any = {};
      if (direction) filter.direction = direction;
      if (type) filter.type = type;
      if (status) filter.status = status;
      if (isRead !== undefined) filter.isRead = isRead === "true";
      if (from) filter["from.email"] = { $regex: from, $options: "i" };
      if (to) filter["to.email"] = { $regex: to, $options: "i" };
      if (subject) filter.subject = { $regex: subject, $options: "i" };

      const skip = (Number(page) - 1) * Number(limit);

      const emails = await EmailModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("assignedTo", "name email")
        .populate("relatedOrderId")
        .populate("relatedCustomerId");

      const total = await EmailModel.countDocuments(filter);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          emails,
          pagination: {
            current: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error: any) {
      console.error("Get emails error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve emails",
        error: error.message,
      });
    }
  },

  // Get email by ID
  getEmailById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const email = await EmailModel.findById(id)
        .populate("assignedTo", "name email")
        .populate("relatedOrderId")
        .populate("relatedCustomerId");

      if (!email) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: email,
      });
    } catch (error: any) {
      console.error("Get email by ID error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve email",
        error: error.message,
      });
    }
  },

  // Test email connection
  testConnection: async (req: Request, res: Response) => {
    try {
      const isConnected = await switchableEmailService.verifyConnection();
      const config = switchableEmailService.getProviderConfig();

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          connected: isConnected,
          provider: config.provider,
          configured: config.isConfigured,
        },
      });
    } catch (error: any) {
      console.error("Test connection error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to test connection",
        error: error.message,
      });
    }
  },

  // Get email service status
  getServiceStatus: async (req: Request, res: Response) => {
    try {
      const config = switchableEmailService.getProviderConfig();
      const stats = config.provider === "aws-ses" ? await switchableEmailService.getSendingStatistics() : null;
      const quota = config.provider === "aws-ses" ? await switchableEmailService.getSendQuota() : null;

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          currentProvider: config.provider,
          isConfigured: config.isConfigured,
          config: config.config,
          ...(stats && { statistics: stats }),
          ...(quota && { quota: quota }),
        },
      });
    } catch (error: any) {
      console.error("Get service status error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get service status",
        error: error.message,
      });
    }
  },
};
