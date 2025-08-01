import { Request, Response } from "express";
import { EmailProcessingService } from "@/services/email-processing.service";
import { switchableEmailService } from "@/services/email-switchable.service";
import { StatusCodes } from "http-status-codes";
import { EmailModel } from "@/models/email.model";
import { EmailDirection, EmailType, EmailStatus, EmailPriority } from "@/contracts/mailbox.contract";
import { MarketingCampaign, SMSMessage, NewsletterSubscriber } from "@/models/marketing.model";
import { EmailThreadModel } from "@/models/email-thread.model";
import { smsService } from "@/services/sms.service";
import crypto from "crypto";

// Helper function to verify SES signature (optional but recommended)
const verifySESSignature = (notification: any): boolean => {
  try {
    // In production, you should verify the SNS signature
    // For now, we'll do basic validation
    return notification && notification.Type && notification.Message;
  } catch (error) {
    console.error('Error verifying SES signature:', error);
    return false;
  }
};

export const MailboxController = {
  // Process incoming email (from webhooks)
  processEmail: async (req: Request, res: Response) => {
    try {
      const emailEvent = req.body;
      // Verify the notification signature (optional but recommended)
      const isSignatureValid = verifySESSignature(emailEvent);
      if (!isSignatureValid) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Invalid SES notification signature."
        });
      }

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
        // Normalize subject and generate thread ID
        const normalizedSubject = subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim();
        const threadId = `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${Date.now()}`;

        // Save sent email to database
        const emailData = {
          messageId: result.messageId,
          threadId,
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

        // Create or update email thread
        try {
          await MailboxController.createOrUpdateEmailThread(savedEmail);
        } catch (threadError) {
          console.error("Error creating/updating email thread:", threadError);
          // Don't fail the email send if thread creation fails
        }

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

  // Send/Reply to Email from System
  sendMarketingEmail: async (req: Request, res: Response) => {
    try {
      const { to, subject, body, html, from, replyTo, cc, bcc }: any = req.body;
      const emailResult: any = await switchableEmailService.sendEmail({
        to,
        subject,
        body,
        html,
        from,
        replyTo,
        cc,
        bcc,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Marketing Email sent successfully",
        data: {
          email: emailResult.email,
          messageId: emailResult.messageId,
          error: emailResult.error,
        },
      });
    } catch (error: any) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Retrieve Email History
  getEmailHistory: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const history = await EmailModel.find({ "to.email": userId })
        .populate("assignedTo")
        .populate("relatedOrderId")
        .populate("relatedCustomerId")
        .exec();
      res.status(StatusCodes.OK).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      console.error("Get email history error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve email history",
        error: error.message,
      });
    }
  },

  // Create Marketing Campaign
  createCampaign: async (req: Request, res: Response) => {
    try {
      const { name, subject, message, recipients } = req.body;
      const campaign = new MarketingCampaign({ name, subject, message, recipients });
      await campaign.save();
      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Campaign created successfully",
        data: campaign,
      });
    } catch (error: any) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Get Marketing Campaigns
  getCampaigns: async (req: Request, res: Response) => {
    try {
      const campaigns = await MarketingCampaign.find();
      res.status(StatusCodes.OK).json({
        success: true,
        data: campaigns,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Send SMS functionality
  sendSms: async (req: Request, res: Response) => {
    try {
      const { to, message } = req.body;
      const smsResponse = await smsService.sendSMS({ to, message });
      const newSms = new SMSMessage({ to, from: "system", message, status: smsResponse.status });
      await newSms.save();
      res.status(StatusCodes.OK).json({
        success: true,
        message: "SMS sent successfully",
        data: newSms,
      });
    } catch (error: any) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Get SMS History
  getSmsHistory: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const history = await SMSMessage.find({ to: userId });
      res.status(StatusCodes.OK).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve SMS history",
        error: error.message,
      });
    }
  },

  // Newsletter Subscription
  subscribeToNewsletter: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const newSubscriber = new NewsletterSubscriber({ email });
      await newSubscriber.save();
      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Subscribed to newsletter successfully",
        data: newSubscriber,
      });
    } catch (error: any) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Get Newsletter Subscribers
  getSubscribers: async (req: Request, res: Response) => {
    try {
      const subscribers = await NewsletterSubscriber.find();
      res.status(StatusCodes.OK).json({
        success: true,
        data: subscribers,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  },

  // UC-17.6: Email Thread History Implementation

  // FR 17.6.1: Store Sent and Received Emails with Thread Management
  createOrUpdateEmailThread: async (email: any) => {
    try {
      // Generate thread ID based on subject (normalize by removing Re: Fwd: etc.)
      const normalizedSubject = email.subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim();
      const threadId = email.threadId || `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;

      // Get all participants
      let participants = [email.from];
      if (email.to && Array.isArray(email.to)) {
        participants = participants.concat(email.to);
      }
      if (email.cc && Array.isArray(email.cc)) {
        participants = participants.concat(email.cc);
      }

      // Remove duplicates
      participants = participants.filter(
        (participant, index, self) => index === self.findIndex((p) => p.email === participant.email)
      );

      // Find existing thread or create new one
      let thread = await EmailThreadModel.findOne({ threadId });

      if (thread) {
        // Update existing thread
        thread.messageCount += 1;
        thread.lastMessageAt = new Date();

        // Add new participants if any
        participants.forEach((participant) => {
          if (!thread!.participants.some((p: any) => p.email === participant.email)) {
            thread!.participants.push(participant);
          }
        });

        await thread.save();
      } else {
        // Create new thread
        thread = new EmailThreadModel({
          threadId,
          subject: normalizedSubject,
          participants,
          messageCount: 1,
          lastMessageAt: new Date(),
          status: "active",
        });
        await thread.save();
      }

      return thread;
    } catch (error: any) {
      console.error("Error creating/updating email thread:", error);
      throw error;
    }
  },

  // FR 17.6.2: Retrieve Email Thread for User
  getEmailThreads: async (req: Request, res: Response) => {
    try {
      const { userEmail, page = 1, limit = 20, status = "active" } = req.query;

      if (!userEmail) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "User email is required",
        });
      }

      const filter: any = {
        "participants.email": userEmail,
        status,
      };

      const skip = (Number(page) - 1) * Number(limit);

      const threads = await EmailThreadModel.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("assignedTo", "name email")
        .populate("relatedOrderId")
        .populate("relatedCustomerId");

      const total = await EmailThreadModel.countDocuments(filter);

      // Get unread count for each thread
      const threadsWithUnreadCount = await Promise.all(
        threads.map(async (thread) => {
          const unreadCount = await EmailModel.countDocuments({
            threadId: thread.threadId,
            isRead: false,
            "to.email": userEmail,
          });

          return {
            ...thread.toObject(),
            unreadCount,
          };
        })
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          threads: threadsWithUnreadCount,
          pagination: {
            current: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error: any) {
      console.error("Get email threads error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve email threads",
        error: error.message,
      });
    }
  },

  // FR 17.6.3: Display Email Thread in Conversation Format
  getEmailThreadConversation: async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const { userEmail, markAsRead = false } = req.query;

      if (!threadId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Thread ID is required",
        });
      }

      // Get thread information
      const thread = await EmailThreadModel.findOne({ threadId })
        .populate("assignedTo", "name email")
        .populate("relatedOrderId")
        .populate("relatedCustomerId");

      if (!thread) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email thread not found",
        });
      }

      // Get all emails in the thread, sorted chronologically
      const emails = await EmailModel.find({ threadId })
        .sort({ receivedAt: 1, sentAt: 1 })
        .populate("assignedTo", "name email")
        .populate("relatedOrderId")
        .populate("relatedCustomerId");

      // Mark emails as read if requested
      if (markAsRead === "true" && userEmail) {
        await EmailModel.updateMany(
          {
            threadId,
            "to.email": userEmail,
            isRead: false,
          },
          {
            $set: {
              isRead: true,
              readAt: new Date(),
            },
          }
        );
      }

      // Format conversation
      const conversation = emails.map((email, index) => ({
        id: email._id,
        messageId: email.messageId,
        direction: email.direction,
        type: email.type,
        status: email.status,
        priority: email.priority,
        subject: email.subject,
        textContent: email.textContent,
        htmlContent: email.htmlContent,
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        replyTo: email.replyTo,
        attachments: email.attachments,
        receivedAt: email.receivedAt,
        sentAt: email.sentAt,
        readAt: email.readAt,
        isRead: email.isRead,
        isReplied: email.isReplied,
        isForwarded: email.isForwarded,
        tags: email.tags,
        labels: email.labels,
        assignedTo: email.assignedTo,
        relatedOrderId: email.relatedOrderId,
        relatedCustomerId: email.relatedCustomerId,
        createdAt: email.createdAt,
        updatedAt: email.updatedAt,
        // Conversation specific fields
        sequenceNumber: index + 1,
        isFirstMessage: index === 0,
        isLastMessage: index === emails.length - 1,
        timeSincePrevious:
          index > 0
            ? new Date(email.receivedAt || email.sentAt!).getTime() -
              new Date(emails[index - 1].receivedAt || emails[index - 1].sentAt!).getTime()
            : null,
      }));

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          thread: {
            ...thread.toObject(),
            totalMessages: emails.length,
            unreadCount: emails.filter(
              (email) => !email.isRead && email.to.some((recipient: any) => recipient.email === userEmail)
            ).length,
          },
          conversation,
          summary: {
            totalMessages: emails.length,
            sentMessages: emails.filter((email) => email.direction === "outbound").length,
            receivedMessages: emails.filter((email) => email.direction === "inbound").length,
            unreadMessages: emails.filter((email) => !email.isRead).length,
            firstMessageDate: emails.length > 0 ? emails[0].receivedAt || emails[0].sentAt : null,
            lastMessageDate:
              emails.length > 0 ? emails[emails.length - 1].receivedAt || emails[emails.length - 1].sentAt : null,
            participants: thread.participants.length,
            hasAttachments: emails.some((email) => email.attachments && email.attachments.length > 0),
          },
        },
      });
    } catch (error: any) {
      console.error("Get email thread conversation error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve email thread conversation",
        error: error.message,
      });
    }
  },

  // Get thread by ID
  getEmailThreadById: async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;

      const thread = await EmailThreadModel.findOne({ threadId })
        .populate("assignedTo", "name email")
        .populate("relatedOrderId")
        .populate("relatedCustomerId");

      if (!thread) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email thread not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: thread,
      });
    } catch (error: any) {
      console.error("Get email thread by ID error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve email thread",
        error: error.message,
      });
    }
  },

  // Update thread status
  updateEmailThreadStatus: async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const { status, assignedTo, tags } = req.body;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (assignedTo) updateData.assignedTo = assignedTo;
      if (tags) updateData.tags = tags;

      const thread = await EmailThreadModel.findOneAndUpdate({ threadId }, updateData, { new: true }).populate(
        "assignedTo",
        "name email"
      );

      if (!thread) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email thread not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Email thread updated successfully",
        data: thread,
      });
    } catch (error: any) {
      console.error("Update email thread error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update email thread",
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
