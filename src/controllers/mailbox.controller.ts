import { Request, Response } from "express";
import { EmailProcessingService } from "@/services/email-processing.service";
import { switchableEmailService } from "@/services/email-switchable.service";
import { StatusCodes } from "http-status-codes";
import { EmailModel } from "@/models/email.model";
import { EmailDirection, EmailType, EmailStatus, EmailPriority } from "@/contracts/mailbox.contract";
import { MarketingCampaign, SMSMessage, NewsletterSubscriber } from "@/models/marketing.model";
import { EmailThreadModel } from "@/models/email-thread.model";
import { smsService } from "@/services/sms.service";
import { EmailAccountModel } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";
import { socketManager } from "@/datasources/socket.datasource";
import { emailAccountConfigService } from "@/services/email-account-config.service";
import crypto from "crypto";

// Helper function to verify SES signature (optional but recommended)
const verifySESSignature = (notification: any): boolean => {
  try {
    // In production, you should verify the SNS signature
    // For now, we'll do basic validation
    return notification && notification.Type && notification.Message;
  } catch (error) {
    console.error("Error verifying SES signature:", error);
    return false;
  }
};

export const MailboxController = {
  // Process incoming email (from webhooks)
  // DISABLED: Auto-sync is disabled - manual sync only
  processEmail: async (req: Request, res: Response) => {
    const webhookRequestId = crypto.randomUUID();

    logger.info(`[${webhookRequestId}] Webhook request received but auto-sync is disabled`, {
      ip: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
      contentType: req.get("Content-Type"),
      contentLength: req.get("Content-Length"),
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
    });

    // Return success but don't process the email
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Webhook received but auto-sync is disabled - use manual sync",
      requestId: webhookRequestId,
    });
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
        // Check if this is a reply or forward by analyzing subject and finding original email
        const isReply = subject.toLowerCase().includes("re:");
        const isForward = subject.toLowerCase().includes("fwd:") || subject.toLowerCase().includes("fw:");
        let threadId;
        let originalEmailId = null;

        if (isReply || isForward) {
          // Find the original email being replied to or forwarded
          const cleanSubject = subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim();

          // Look for existing emails with similar subject or in same thread
          const originalEmail = await EmailModel.findOne({
            $and: [
              {
                $or: [{ subject: { $regex: cleanSubject, $options: "i" } }, { subject: cleanSubject }],
              },
              {
                $or: [
                  { "from.email": Array.isArray(to) ? to[0] : to },
                  { "to.email": from || switchableEmailService.getProviderConfig().config.defaultFromEmail },
                ],
              },
            ],
          }).sort({ receivedAt: -1 });

          if (originalEmail) {
            threadId = originalEmail.threadId;
            originalEmailId = originalEmail._id;

            // Mark original email as replied or forwarded
            if (isReply) {
              originalEmail.isReplied = true;
              originalEmail.repliedAt = new Date();
              if (!originalEmail.isRead) {
                originalEmail.isRead = true;
                originalEmail.readAt = new Date();
              }
            } else if (isForward) {
              originalEmail.isForwarded = true;
              originalEmail.forwardedAt = new Date();
              if (!originalEmail.isRead) {
                originalEmail.isRead = true;
                originalEmail.readAt = new Date();
              }
            }
            await originalEmail.save();

            logger.info(`Original email updated`, {
              originalEmailId: originalEmail._id,
              isReply,
              isForward,
              threadId,
            });
          } else {
            // No original email found, create new thread
            threadId = `thread_${cleanSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${Date.now()}`;
          }
        } else {
          // New email thread
          const normalizedSubject = subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim();
          threadId = `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${Date.now()}`;
        }

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
          isRead: true, // Outbound emails are considered "read" by the sender
          readAt: new Date(),
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
        .populate("relatedOrderId");

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
        .populate("relatedOrderId");

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
        .populate("relatedOrderId");

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
        .populate("relatedOrderId");

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
        .populate("relatedOrderId");

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
      const { markAsRead = false } = req.query;

      const email = await EmailModel.findById(id).populate("assignedTo", "name email").populate("relatedOrderId");

      if (!email) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email not found",
        });
      }

      // Mark as read if requested (like when user opens email)
      if (markAsRead === "true" && !email.isRead) {
        email.isRead = true;
        email.readAt = new Date();
        await email.save();

        logger.info("Email marked as read", {
          emailId: email._id,
          messageId: email.messageId,
          readAt: email.readAt,
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

  // ====================
  // EMAIL STATUS FLAGS MANAGEMENT (Real Email Client Functionality)
  // ====================

  // Mark single email as read/unread
  markEmailAsRead: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isRead = true } = req.body;

      const email = await EmailModel.findById(id);
      if (!email) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email not found",
        });
      }

      const wasRead = email.isRead;
      email.isRead = isRead;
      email.readAt = isRead && !wasRead ? new Date() : isRead ? email.readAt : null;
      await email.save();

      // Emit real-time notification to all recipients
      const recipients = [...email.to, ...(email.cc || []), ...(email.bcc || [])];
      recipients.forEach((recipient) => {
        socketManager.emitEmailStatusUpdate(recipient.email, {
          emailId: email._id.toString(),
          isRead: email.isRead,
          readAt: email.readAt,
        });
      });

      logger.info(`Email marked as ${isRead ? "read" : "unread"}`, {
        emailId: email._id,
        messageId: email.messageId,
        previousState: wasRead,
        newState: isRead,
        readAt: email.readAt,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: `Email marked as ${isRead ? "read" : "unread"}`,
        data: {
          id: email._id,
          isRead: email.isRead,
          readAt: email.readAt,
        },
      });
    } catch (error: any) {
      console.error("Mark email as read error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update read status",
        error: error.message,
      });
    }
  },

  // Mark multiple emails as read/unread
  markEmailsAsRead: async (req: Request, res: Response) => {
    try {
      const { emailIds, isRead = true } = req.body;

      if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Email IDs array is required",
        });
      }

      const updateData: any = { isRead };
      if (isRead) {
        updateData.readAt = new Date();
      } else {
        updateData.readAt = null;
      }

      const result = await EmailModel.updateMany({ _id: { $in: emailIds } }, { $set: updateData });

      logger.info(`Bulk email read status update`, {
        emailCount: emailIds.length,
        modifiedCount: result.modifiedCount,
        isRead,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: `${result.modifiedCount} emails marked as ${isRead ? "read" : "unread"}`,
        data: {
          requestedCount: emailIds.length,
          modifiedCount: result.modifiedCount,
          isRead,
        },
      });
    } catch (error: any) {
      console.error("Bulk mark emails as read error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update read status",
        error: error.message,
      });
    }
  },

  // Mark email as replied (when user sends a reply)
  markEmailAsReplied: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { repliedAt } = req.body;

      const email = await EmailModel.findById(id);
      if (!email) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email not found",
        });
      }

      email.isReplied = true;
      email.repliedAt = repliedAt ? new Date(repliedAt) : new Date();

      // Also mark as read when replying
      if (!email.isRead) {
        email.isRead = true;
        email.readAt = new Date();
      }

      await email.save();

      logger.info("Email marked as replied", {
        emailId: email._id,
        messageId: email.messageId,
        repliedAt: email.repliedAt,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Email marked as replied",
        data: {
          id: email._id,
          isReplied: email.isReplied,
          repliedAt: email.repliedAt,
          isRead: email.isRead,
          readAt: email.readAt,
        },
      });
    } catch (error: any) {
      console.error("Mark email as replied error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to mark email as replied",
        error: error.message,
      });
    }
  },

  // Mark email as forwarded (when user forwards an email)
  markEmailAsForwarded: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { forwardedAt, forwardedTo } = req.body;

      const email = await EmailModel.findById(id);
      if (!email) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email not found",
        });
      }

      email.isForwarded = true;
      email.forwardedAt = forwardedAt ? new Date(forwardedAt) : new Date();

      // Store forwarded recipients in tags or custom field
      if (forwardedTo) {
        const forwardTag = `forwarded_to:${Array.isArray(forwardedTo) ? forwardedTo.join(",") : forwardedTo}`;
        if (!email.tags.includes(forwardTag)) {
          email.tags.push(forwardTag);
        }
      }

      // Also mark as read when forwarding
      if (!email.isRead) {
        email.isRead = true;
        email.readAt = new Date();
      }

      await email.save();

      logger.info("Email marked as forwarded", {
        emailId: email._id,
        messageId: email.messageId,
        forwardedAt: email.forwardedAt,
        forwardedTo,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Email marked as forwarded",
        data: {
          id: email._id,
          isForwarded: email.isForwarded,
          forwardedAt: email.forwardedAt,
          isRead: email.isRead,
          readAt: email.readAt,
          tags: email.tags,
        },
      });
    } catch (error: any) {
      console.error("Mark email as forwarded error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to mark email as forwarded",
        error: error.message,
      });
    }
  },

  // Archive/Unarchive emails
  archiveEmails: async (req: Request, res: Response) => {
    try {
      const { emailIds, isArchived = true } = req.body;

      if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Email IDs array is required",
        });
      }

      const updateData: any = { isArchived };
      if (isArchived) {
        updateData.archivedAt = new Date();
      } else {
        updateData.archivedAt = null;
      }

      const result = await EmailModel.updateMany({ _id: { $in: emailIds } }, { $set: updateData });

      logger.info(`Bulk email archive status update`, {
        emailCount: emailIds.length,
        modifiedCount: result.modifiedCount,
        isArchived,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: `${result.modifiedCount} emails ${isArchived ? "archived" : "unarchived"}`,
        data: {
          requestedCount: emailIds.length,
          modifiedCount: result.modifiedCount,
          isArchived,
        },
      });
    } catch (error: any) {
      console.error("Archive emails error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to archive emails",
        error: error.message,
      });
    }
  },

  // Mark emails as spam/not spam
  markEmailsAsSpam: async (req: Request, res: Response) => {
    try {
      const { emailIds, isSpam = true, reason } = req.body;

      if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Email IDs array is required",
        });
      }

      const updateData: any = { isSpam };
      if (isSpam) {
        updateData.spamMarkedAt = new Date();
        updateData.status = EmailStatus.SPAM;
        // Add spam reason to tags if provided
        if (reason) {
          updateData.$addToSet = { tags: `spam_reason:${reason}` };
        }
      } else {
        updateData.spamMarkedAt = null;
        updateData.status = EmailStatus.RECEIVED; // Reset to received status
        // Remove spam-related tags
        updateData.$pull = { tags: { $regex: "^spam_reason:" } };
      }

      const result = await EmailModel.updateMany({ _id: { $in: emailIds } }, updateData);

      logger.info(`Bulk email spam status update`, {
        emailCount: emailIds.length,
        modifiedCount: result.modifiedCount,
        isSpam,
        reason,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: `${result.modifiedCount} emails marked as ${isSpam ? "spam" : "not spam"}`,
        data: {
          requestedCount: emailIds.length,
          modifiedCount: result.modifiedCount,
          isSpam,
          reason,
        },
      });
    } catch (error: any) {
      console.error("Mark emails as spam error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to mark emails as spam",
        error: error.message,
      });
    }
  },

  // Get email status summary for a user
  getEmailStatusSummary: async (req: Request, res: Response) => {
    try {
      const { userEmail } = req.query;

      if (!userEmail) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "User email is required",
        });
      }

      const filter = {
        $or: [
          { "from.email": userEmail },
          { "to.email": userEmail },
          { "cc.email": userEmail },
          { "bcc.email": userEmail },
        ],
      };

      const [inboundStats, outboundStats] = await Promise.all([
        // Inbound email stats
        EmailModel.aggregate([
          {
            $match: {
              ...filter,
              direction: EmailDirection.INBOUND,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unread: { $sum: { $cond: ["$isRead", 0, 1] } },
              read: { $sum: { $cond: ["$isRead", 1, 0] } },
              replied: { $sum: { $cond: ["$isReplied", 1, 0] } },
              forwarded: { $sum: { $cond: ["$isForwarded", 1, 0] } },
              archived: { $sum: { $cond: ["$isArchived", 1, 0] } },
              spam: { $sum: { $cond: ["$isSpam", 1, 0] } },
            },
          },
        ]),
        // Outbound email stats
        EmailModel.aggregate([
          {
            $match: {
              ...filter,
              direction: EmailDirection.OUTBOUND,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              sent: { $sum: { $cond: [{ $eq: ["$status", EmailStatus.PROCESSED] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ["$status", EmailStatus.FAILED] }, 1, 0] } },
              archived: { $sum: { $cond: ["$isArchived", 1, 0] } },
            },
          },
        ]),
      ]);

      const inbound = inboundStats[0] || {
        total: 0,
        unread: 0,
        read: 0,
        replied: 0,
        forwarded: 0,
        archived: 0,
        spam: 0,
      };

      const outbound = outboundStats[0] || {
        total: 0,
        sent: 0,
        failed: 0,
        archived: 0,
      };

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          userEmail,
          inbound: {
            total: inbound.total,
            unread: inbound.unread,
            read: inbound.read,
            replied: inbound.replied,
            forwarded: inbound.forwarded,
            archived: inbound.archived,
            spam: inbound.spam,
            active: inbound.total - inbound.archived - inbound.spam,
          },
          outbound: {
            total: outbound.total,
            sent: outbound.sent,
            failed: outbound.failed,
            archived: outbound.archived,
            active: outbound.total - outbound.archived,
          },
          overall: {
            total: inbound.total + outbound.total,
            totalActive: inbound.total - inbound.archived - inbound.spam + (outbound.total - outbound.archived),
            totalArchived: inbound.archived + outbound.archived,
            totalSpam: inbound.spam,
          },
        },
      });
    } catch (error: any) {
      console.error("Get email status summary error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get email status summary",
        error: error.message,
      });
    }
  },

  // Bulk update email status flags
  bulkUpdateEmailStatus: async (req: Request, res: Response) => {
    try {
      const { emailIds, updates } = req.body;

      if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Email IDs array is required",
        });
      }

      if (!updates || typeof updates !== "object") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Updates object is required",
        });
      }

      // Validate and prepare update data
      const updateData: any = {};
      const validFlags = ["isRead", "isReplied", "isForwarded", "isArchived", "isSpam"];

      for (const flag of validFlags) {
        if (updates[flag] !== undefined) {
          updateData[flag] = updates[flag];

          // Set corresponding timestamp fields
          if (flag === "isRead" && updates[flag]) {
            updateData.readAt = new Date();
          } else if (flag === "isRead" && !updates[flag]) {
            updateData.readAt = null;
          } else if (flag === "isArchived" && updates[flag]) {
            updateData.archivedAt = new Date();
          } else if (flag === "isArchived" && !updates[flag]) {
            updateData.archivedAt = null;
          } else if (flag === "isSpam" && updates[flag]) {
            updateData.spamMarkedAt = new Date();
            updateData.status = EmailStatus.SPAM;
          } else if (flag === "isSpam" && !updates[flag]) {
            updateData.spamMarkedAt = null;
            updateData.status = EmailStatus.RECEIVED;
          }
        }
      }

      const result = await EmailModel.updateMany({ _id: { $in: emailIds } }, { $set: updateData });

      // Get updated emails for real-time notifications
      const updatedEmails = await EmailModel.find({ _id: { $in: emailIds } });

      // Group emails by recipient for real-time notifications
      const recipientUpdates = new Map<string, any[]>();
      updatedEmails.forEach((email) => {
        const recipients = [...email.to, ...(email.cc || []), ...(email.bcc || [])];
        recipients.forEach((recipient) => {
          if (!recipientUpdates.has(recipient.email)) {
            recipientUpdates.set(recipient.email, []);
          }
          recipientUpdates.get(recipient.email)!.push({
            emailId: email._id.toString(),
            ...updateData,
          });
        });
      });

      // Emit real-time notifications
      recipientUpdates.forEach((updates, recipientEmail) => {
        socketManager.emitBulkEmailStatusUpdate(recipientEmail, updates);
      });

      logger.info("Bulk email status update", {
        emailCount: emailIds.length,
        modifiedCount: result.modifiedCount,
        updates: updateData,
        recipientsNotified: recipientUpdates.size,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: `${result.modifiedCount} emails updated`,
        data: {
          requestedCount: emailIds.length,
          modifiedCount: result.modifiedCount,
          updates: updateData,
        },
      });
    } catch (error: any) {
      console.error("Bulk update email status error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update email status",
        error: error.message,
      });
    }
  },
  // Create new email account
  createEmailAccount: async (req: Request, res: Response) => {
    try {
      const accountData = req.body;

      // Validate account data
      const validation = emailAccountConfigService.validateEmailAccount(accountData);
      if (!validation.isValid) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid account configuration",
          errors: validation.errors,
        });
      }

      // Encrypt passwords before saving
      if (accountData.incomingServer?.password) {
        accountData.incomingServer.password = emailAccountConfigService.encryptPassword(
          accountData.incomingServer.password
        );
      }
      if (accountData.outgoingServer?.password) {
        accountData.outgoingServer.password = emailAccountConfigService.encryptPassword(
          accountData.outgoingServer.password
        );
      }

      // Create account
      const newAccount = await EmailAccountModel.create(accountData);

      // Test connections after creation
      const connectionResults = await emailAccountConfigService.testConnections(newAccount);

      logger.info(`Email account created: ${newAccount.emailAddress}`, {
        accountId: newAccount._id,
        smtpConnectionSuccess: connectionResults.smtp.success,
        imapConnectionSuccess: connectionResults.imap.success,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: newAccount,
        connectionTests: connectionResults,
      });
    } catch (error: any) {
      console.error("Create email account error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create email account",
        error: error.message,
      });
    }
  },

  // Get all email accounts
  getEmailAccounts: async (req: Request, res: Response) => {
    try {
      const accounts = await EmailAccountModel.find();
      res.status(StatusCodes.OK).json({
        success: true,
        data: accounts,
      });
    } catch (error: any) {
      console.error("Get email accounts error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve email accounts",
        error: error.message,
      });
    }
  },

  // Get email account by ID
  getEmailAccountById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const account = await EmailAccountModel.findById(id);
      if (!account) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email account not found",
        });
      }
      res.status(StatusCodes.OK).json({
        success: true,
        data: account,
      });
    } catch (error: any) {
      console.error("Get email account by ID error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve email account",
        error: error.message,
      });
    }
  },

  // Update email account
  updateEmailAccount: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedAccount = await EmailAccountModel.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedAccount) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email account not found",
        });
      }
      res.status(StatusCodes.OK).json({
        success: true,
        data: updatedAccount,
      });
    } catch (error: any) {
      console.error("Update email account error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update email account",
        error: error.message,
      });
    }
  },

  // Delete email account
  deleteEmailAccount: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const account = await EmailAccountModel.findByIdAndDelete(id);
      if (!account) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email account not found",
        });
      }
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Email account deleted",
      });
    } catch (error: any) {
      console.error("Delete email account error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete email account",
        error: error.message,
      });
    }
  },
  // ====================
  // IMAP/POP3 PROTOCOL SUPPORT FOR EXTERNAL EMAIL CLIENTS
  // ====================
  // Get emails in IMAP format for external email clients
  getIMAPMessages: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { folder = "INBOX", limit = 50, offset = 0, flags, since, before } = req.query;

      // Build filter based on folder and flags
      const filter: any = {
        $or: [{ "to.email": userId }, { "cc.email": userId }, { "bcc.email": userId }],
      };

      // Folder filtering
      switch (folder) {
        case "INBOX":
          filter.isArchived = { $ne: true };
          filter.isSpam = { $ne: true };
          break;
        case "ARCHIVE":
          filter.isArchived = true;
          break;
        case "SPAM":
          filter.isSpam = true;
          break;
        case "SENT":
          filter.direction = EmailDirection.OUTBOUND;
          filter["from.email"] = userId;
          break;
        case "DRAFTS":
          filter.status = EmailStatus.PROCESSING;
          break;
      }

      // Date filtering
      if (since) {
        filter.receivedAt = { $gte: new Date(since as string) };
      }
      if (before) {
        filter.receivedAt = { ...filter.receivedAt, $lt: new Date(before as string) };
      }

      const emails = await EmailModel.find(filter)
        .sort({ receivedAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .select("-rawEmailData"); // Exclude large raw data

      // Convert to IMAP format
      const imapMessages = emails.map((email) => ({
        uid: email._id.toString(),
        flags: [
          email.isRead ? "\\Seen" : "\\Unseen",
          email.isReplied ? "\\Answered" : "",
          email.isForwarded ? "\\Forwarded" : "",
          email.isArchived ? "\\Archived" : "",
          email.isSpam ? "\\Spam" : "",
        ].filter(Boolean),
        internalDate: email.receivedAt,
        envelope: {
          date: email.receivedAt,
          subject: email.subject,
          from: [email.from],
          to: email.to,
          cc: email.cc || [],
          bcc: email.bcc || [],
          messageId: email.messageId,
          inReplyTo: email.headers?.find((h: any) => h.name === "In-Reply-To")?.value,
          references: email.headers?.find((h: any) => h.name === "References")?.value,
        },
        bodyStructure: {
          type: "text",
          subtype: "plain",
          encoding: "7bit",
          size: email.textContent?.length || 0,
        },
        text: email.textContent,
        html: email.htmlContent,
      }));

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          messages: imapMessages,
          total: await EmailModel.countDocuments(filter),
          folder,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error: any) {
      console.error("Get IMAP messages error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get IMAP messages",
        error: error.message,
      });
    }
  },
  // Update email flags in IMAP format
  updateIMAPFlags: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { messageId } = req.params;
      const { flags, operation = "set" } = req.body; // operation: 'set', 'add', 'remove'

      if (!flags || !Array.isArray(flags)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Flags array is required",
        });
      }

      const email = await EmailModel.findOne({
        _id: messageId,
        $or: [{ "to.email": userId }, { "cc.email": userId }, { "bcc.email": userId }, { "from.email": userId }],
      });

      if (!email) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email not found",
        });
      }

      // Map IMAP flags to email status
      const flagUpdates: any = {};

      flags.forEach((flag) => {
        switch (flag) {
          case "\\Seen":
            if (operation === "set" || operation === "add") {
              flagUpdates.isRead = true;
              flagUpdates.readAt = new Date();
            } else if (operation === "remove") {
              flagUpdates.isRead = false;
              flagUpdates.readAt = null;
            }
            break;
          case "\\Answered":
            if (operation === "set" || operation === "add") {
              flagUpdates.isReplied = true;
              flagUpdates.repliedAt = new Date();
            } else if (operation === "remove") {
              flagUpdates.isReplied = false;
              flagUpdates.repliedAt = null;
            }
            break;
          case "\\Forwarded":
            if (operation === "set" || operation === "add") {
              flagUpdates.isForwarded = true;
              flagUpdates.forwardedAt = new Date();
            } else if (operation === "remove") {
              flagUpdates.isForwarded = false;
              flagUpdates.forwardedAt = null;
            }
            break;
          case "\\Archived":
            if (operation === "set" || operation === "add") {
              flagUpdates.isArchived = true;
              flagUpdates.archivedAt = new Date();
            } else if (operation === "remove") {
              flagUpdates.isArchived = false;
              flagUpdates.archivedAt = null;
            }
            break;
          case "\\Spam":
            if (operation === "set" || operation === "add") {
              flagUpdates.isSpam = true;
              flagUpdates.spamMarkedAt = new Date();
              flagUpdates.status = EmailStatus.SPAM;
            } else if (operation === "remove") {
              flagUpdates.isSpam = false;
              flagUpdates.spamMarkedAt = null;
              flagUpdates.status = EmailStatus.RECEIVED;
            }
            break;
        }
      });

      // Update email
      Object.assign(email, flagUpdates);
      await email.save();

      // Emit real-time notification
      const recipients = [...email.to, ...(email.cc || []), ...(email.bcc || [])];
      recipients.forEach((recipient) => {
        socketManager.emitEmailStatusUpdate(recipient.email, {
          emailId: email._id.toString(),
          ...flagUpdates,
        });
      });

      logger.info("IMAP flags updated", {
        messageId,
        userId,
        flags,
        operation,
        updates: flagUpdates,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Email flags updated successfully",
        data: {
          messageId: email._id,
          flags: [
            email.isRead ? "\\Seen" : "\\Unseen",
            email.isReplied ? "\\Answered" : "",
            email.isForwarded ? "\\Forwarded" : "",
            email.isArchived ? "\\Archived" : "",
            email.isSpam ? "\\Spam" : "",
          ].filter(Boolean),
        },
      });
    } catch (error: any) {
      console.error("Update IMAP flags error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update email flags",
        error: error.message,
      });
    }
  },
  // Get email client capabilities
  getEmailClientCapabilities: async (req: Request, res: Response) => {
    try {
      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          protocol: "IMAP",
          version: "1.0",
          capabilities: [
            "IMAP4rev1",
            "STARTTLS",
            "AUTH=PLAIN",
            "AUTH=LOGIN",
            "IDLE",
            "CONDSTORE",
            "ENABLE",
            "UTF8=ACCEPT",
            "MOVE",
            "UIDPLUS",
            "UNSELECT",
            "CHILDREN",
            "LIST-EXTENDED",
            "LIST-STATUS",
            "LIST-SUBSCRIBED",
            "LIST-UNSUBSCRIPTION",
            "LIST-MYRIGHTS",
            "LIST-METADATA",
            "METADATA",
            "METADATA-SERVER",
            "NOTIFY",
            "FILTERS",
            "LOGINDISABLED",
            "QUOTA",
            "SORT",
            "THREAD=ORDEREDSUBJECT",
            "THREAD=REFERENCES",
            "THREAD=REFS",
            "ANNOTATE-EXPERIMENT-1",
            "CATENATE",
            "COMPRESS=DEFLATE",
            "ESEARCH",
            "ESORT",
            "ID",
            "MULTIAPPEND",
            "MULTISEARCH",
            "NAMESPACE",
            "QRESYNC",
            "UTF8=ONLY",
            "WITHIN",
            "XLIST",
          ],
          folders: [
            { name: "INBOX", delimiter: "/", flags: ["\\HasNoChildren"] },
            { name: "Sent", delimiter: "/", flags: ["\\HasNoChildren"] },
            { name: "Drafts", delimiter: "/", flags: ["\\HasNoChildren"] },
            { name: "Trash", delimiter: "/", flags: ["\\HasNoChildren"] },
            { name: "Archive", delimiter: "/", flags: ["\\HasNoChildren"] },
            { name: "Spam", delimiter: "/", flags: ["\\HasNoChildren"] },
          ],
          flags: [
            "\\Seen",
            "\\Answered",
            "\\Flagged",
            "\\Deleted",
            "\\Draft",
            "\\Recent",
            "\\Forwarded",
            "\\Archived",
            "\\Spam",
          ],
        },
      });
    } catch (error: any) {
      console.error("Get email client capabilities error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get email client capabilities",
        error: error.message,
      });
    }
  },
};
