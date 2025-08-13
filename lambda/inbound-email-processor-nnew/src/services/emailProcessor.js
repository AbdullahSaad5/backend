"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailProcessor = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const email_model_1 = require("../models/email.model.js");
const uuid_1 = require("uuid");
const he = __importStar(require("he"));
const s3 = new aws_sdk_1.default.S3();
const ses = new aws_sdk_1.default.SES();
class EmailProcessor {
  static BUCKET_NAME = process.env.S3_BUCKET_NAME;
  static async processInboundEmail(sesNotification) {
    try {
      // Extract only essential data
      const mail = sesNotification.mail;
      const headers = mail.headers;
      const commonHeaders = mail.commonHeaders;

      // Fast thread ID extraction - no DB queries
      const threadId = this.extractThreadId(headers, commonHeaders.subject, commonHeaders.from[0]);

      // Build minimal email object for fast insertion
      const email = {
        messageId: mail.messageId,
        threadId,
        direction: email_model_1.EmailDirection.INBOUND,
        type: email_model_1.EmailType.GENERAL,
        status: email_model_1.EmailStatus.RECEIVED,
        priority: email_model_1.EmailPriority.NORMAL,
        subject: commonHeaders.subject || "No Subject",
        textContent: "", // Skip content parsing for speed
        htmlContent: "",
        from: { email: commonHeaders.from[0] || "" },
        to: (commonHeaders.to || []).map((email) => ({ email })),
        cc: (commonHeaders.cc || []).map((email) => ({ email })),
        bcc: (commonHeaders.bcc || []).map((email) => ({ email })),
        headers,
        attachments: [],
        receivedAt: new Date(mail.timestamp),
        isRead: false,
        isReplied: false,
        isForwarded: false,
        isArchived: false,
        isSpam: false,
        tags: [],
        category: "general",
        rawEmailData: { sesNotification, processingTimestamp: new Date().toISOString() },
      };

      // Single DB operation - fast insert without duplicate check for speed
      const savedEmail = await email_model_1.EmailModel.create(email);
      console.log("✅ Email saved:", savedEmail._id);
      return savedEmail;
    } catch (error) {
      // If duplicate key error, ignore it
      if (error.code === 11000) {
        console.log("Email already exists (duplicate):", sesNotification.mail.messageId);
        return null;
      }
      console.error("❌ Error processing email:", error);
      throw error;
    }
  }
  static async getEmailFromS3(bucketName, objectKey) {
    try {
      const params = {
        Bucket: bucketName,
        Key: objectKey,
      };
      const data = await s3.getObject(params).promise();
      return data.Body?.toString() || "";
    } catch (error) {
      console.error("Error retrieving email from S3:", error);
      throw error;
    }
  }
  static async parseEmailContent(rawEmail) {
    const lines = rawEmail.split("\n");
    let textContent = "";
    let htmlContent = "";
    let attachments = [];
    let inBody = false;
    let isHTML = false;
    for (const line of lines) {
      if (line.trim() === "") {
        inBody = true;
        continue;
      }
      if (inBody) {
        if (line.includes("Content-Type: text/html")) {
          isHTML = true;
        } else if (line.includes("Content-Type: text/plain")) {
          isHTML = false;
        }
        if (isHTML) {
          htmlContent += line + "\n";
        } else {
          textContent += line + "\n";
        }
      }
    }
    if (htmlContent) {
      htmlContent = this.cleanHtmlContent(htmlContent);
    }
    return {
      textContent: textContent.trim(),
      htmlContent: htmlContent.trim(),
      attachments,
    };
  }
  static cleanHtmlContent(html) {
    const decoded = he.decode(html);
    return decoded.replace(/<[^>]*>/g, "").trim();
  }
  static parseEmailAddress(emailString) {
    const match = emailString.match(/^(.+?)\s*<(.+?)>$|^(.+)$/);
    if (match) {
      if (match[2]) {
        return {
          name: match[1]?.trim(),
          email: match[2].trim(),
        };
      } else {
        return {
          email: match[3]?.trim() || emailString,
        };
      }
    }
    return { email: emailString };
  }
  static extractThreadId(headers, subject, fromEmail) {
    const messageIdHeader = headers.find((h) => h.name.toLowerCase() === "message-id");
    const inReplyToHeader = headers.find((h) => h.name.toLowerCase() === "in-reply-to");
    const referencesHeader = headers.find((h) => h.name.toLowerCase() === "references");

    let threadId = null;
    let isReply = false;

    // Check if this is a reply
    const subjectLower = subject ? subject.toLowerCase() : "";
    isReply = subjectLower.includes("re:") || inReplyToHeader || referencesHeader;

    console.log("Email analysis - Subject:", subject, "IsReply:", isReply);

    // If this is a reply, extract thread ID directly from headers
    if (isReply) {
      // First priority: References header (contains thread ID as first message ID)
      if (referencesHeader) {
        const references = referencesHeader.value.split(/\s+/);
        const firstReference = references[0]; // First reference is the thread root
        const refMatch = firstReference.match(/<(.+?)>/);
        threadId = refMatch ? refMatch[1] : firstReference;
        threadId = threadId.replace(/[<>]/g, "").trim();
        console.log("Using thread ID from References (first reference):", threadId);
        return threadId;
      }

      // Second priority: In-Reply-To header (direct parent message ID = thread ID)
      if (inReplyToHeader) {
        const replyMatch = inReplyToHeader.value.match(/<(.+?)>/);
        threadId = replyMatch ? replyMatch[1] : inReplyToHeader.value;
        threadId = threadId.replace(/[<>]/g, "").trim();
        console.log("Using thread ID from In-Reply-To:", threadId);
        return threadId;
      }
    }

    // For new threads (not replies), use the current message ID as thread ID
    if (messageIdHeader) {
      threadId = messageIdHeader.value.replace(/[<>]/g, "").trim();
      console.log("Creating new thread with current message ID:", threadId);
      return threadId;
    }

    // Fallback: generate a new UUID
    const fallbackThreadId = (0, uuid_1.v4)();
    console.log("Using fallback UUID as thread ID:", fallbackThreadId);
    return fallbackThreadId;
  }
  static classifyEmailType(mail) {
    const subject = mail.commonHeaders.subject?.toLowerCase() || "";
    const fromEmail = mail.commonHeaders.from[0]?.toLowerCase() || "";
    if (fromEmail.includes("amazon") || subject.includes("amazon")) {
      if (subject.includes("order") || subject.includes("purchase")) {
        return email_model_1.EmailType.AMAZON_ORDER;
      }
      return email_model_1.EmailType.AMAZON_NOTIFICATION;
    }
    if (fromEmail.includes("ebay") || subject.includes("ebay")) {
      return email_model_1.EmailType.EBAY_MESSAGE;
    }
    if (subject.includes("support") || subject.includes("help")) {
      return email_model_1.EmailType.SUPPORT;
    }
    if (subject.includes("marketing") || subject.includes("newsletter")) {
      return email_model_1.EmailType.MARKETING;
    }
    return email_model_1.EmailType.GENERAL;
  }
  static determinePriority(mail) {
    const subject = mail.commonHeaders.subject?.toLowerCase() || "";
    const priorityHeader = mail.headers.find(
      (h) =>
        h.name.toLowerCase() === "priority" ||
        h.name.toLowerCase() === "x-priority" ||
        h.name.toLowerCase() === "importance"
    );
    if (priorityHeader) {
      const priority = priorityHeader.value.toLowerCase();
      if (priority.includes("urgent") || priority.includes("high")) {
        return email_model_1.EmailPriority.URGENT;
      }
      if (priority.includes("low")) {
        return email_model_1.EmailPriority.LOW;
      }
    }
    if (subject.includes("urgent") || subject.includes("asap") || subject.includes("immediate")) {
      return email_model_1.EmailPriority.URGENT;
    }
    if (subject.includes("important") || subject.includes("priority")) {
      return email_model_1.EmailPriority.HIGH;
    }
    return email_model_1.EmailPriority.NORMAL;
  }
  static getReplyToAddress(headers) {
    const replyToHeader = headers.find((h) => h.name.toLowerCase() === "reply-to");
    if (replyToHeader) {
      return this.parseEmailAddress(replyToHeader.value);
    }
    return undefined;
  }
  static extractTags(mail) {
    const tags = [];
    const subject = mail.commonHeaders.subject?.toLowerCase() || "";
    const tagMatches = subject.match(/\[([^\]]+)\]/g);
    if (tagMatches) {
      tags.push(...tagMatches.map((tag) => tag.replace(/[\[\]]/g, "")));
    }
    return tags;
  }
  static categorizeEmail(mail) {
    const fromEmail = mail.commonHeaders.from[0]?.toLowerCase() || "";
    const subject = mail.commonHeaders.subject?.toLowerCase() || "";

    if (fromEmail.includes("amazon")) return "primary";
    if (fromEmail.includes("ebay")) return "primary";
    if (fromEmail.includes("support")) return "primary";

    // System updates and notifications
    if (
      subject.includes("notification") ||
      subject.includes("alert") ||
      subject.includes("system") ||
      subject.includes("update") ||
      subject.includes("maintenance") ||
      subject.includes("security") ||
      fromEmail.includes("noreply") ||
      fromEmail.includes("no-reply") ||
      fromEmail.includes("system") ||
      fromEmail.includes("admin")
    ) {
      return "updates";
    }

    return "primary";
  }
  static extractAmazonOrderId(mail) {
    const subject = mail.commonHeaders.subject || "";
    const orderIdMatch = subject.match(/order[#\s]*([0-9-]+)/i);
    return orderIdMatch ? orderIdMatch[1] : undefined;
  }
  static extractAmazonBuyerId(mail) {
    const buyerIdHeader = mail.headers.find(
      (h) => h.name.toLowerCase().includes("buyer") || h.name.toLowerCase().includes("customer")
    );
    return buyerIdHeader?.value;
  }
  static extractEbayItemId(mail) {
    const subject = mail.commonHeaders.subject || "";
    const itemIdMatch = subject.match(/item[#\s]*([0-9]+)/i);
    return itemIdMatch ? itemIdMatch[1] : undefined;
  }
  static async processEmailRules(email) {
    console.log("Processing email rules for:", email.messageId);
    if (email.from.email.includes("amazon.com")) {
      email.tags = [...(email.tags || []), "amazon"];
      email.category = "amazon";
    }
    await email.save();
  }

  static async processOutboundEmail(emailData) {
    try {
      console.log("Processing outbound email:", emailData.messageId);

      // Extract thread ID for outbound emails
      const threadId = await this.extractThreadId(
        emailData.headers || [],
        emailData.subject || "No Subject",
        emailData.from?.email || ""
      );

      // If this is a reply, try to find the original thread
      const finalThreadId = await this.findOrCreateThreadId(threadId, emailData.subject, emailData.from?.email);

      // Determine email status flags for outbound emails
      const statusFlags = this.determineEmailStatusFlags(
        {
          commonHeaders: {
            subject: emailData.subject || "",
            from: [emailData.from?.email || ""],
          },
          headers: emailData.headers || [],
        },
        emailData.textContent || "",
        emailData.htmlContent || ""
      );

      const email = {
        messageId: emailData.messageId,
        threadId: finalThreadId,
        direction: email_model_1.EmailDirection.OUTBOUND,
        type: this.classifyEmailType({ commonHeaders: { from: [emailData.from?.email || ""] } }),
        status: email_model_1.EmailStatus.PROCESSED,
        priority: this.determinePriority({ commonHeaders: { subject: emailData.subject || "" } }),
        subject: emailData.subject || "No Subject",
        textContent: emailData.textContent || "",
        htmlContent: emailData.htmlContent || "",
        from: emailData.from,
        to: emailData.to || [],
        cc: emailData.cc || [],
        bcc: emailData.bcc || [],
        replyTo: emailData.replyTo,
        headers: emailData.headers || [],
        attachments: emailData.attachments || [],
        receivedAt: new Date(),
        sentAt: new Date(),
        isRead: statusFlags.isRead,
        isReplied: statusFlags.isReplied,
        isForwarded: statusFlags.isForwarded,
        isArchived: statusFlags.isArchived,
        isSpam: statusFlags.isSpam,
        tags: this.extractTags({ commonHeaders: { subject: emailData.subject || "" } }),
        category: this.categorizeEmail({ commonHeaders: { from: [emailData.from?.email || ""] } }),
        amazonOrderId: emailData.amazonOrderId,
        amazonBuyerId: emailData.amazonBuyerId,
        ebayItemId: emailData.ebayItemId,
        rawEmailData: {
          outboundEmailData: emailData,
          processingTimestamp: new Date().toISOString(),
        },
      };

      const existingEmail = await email_model_1.EmailModel.findOne({ messageId: email.messageId }).exec();
      if (existingEmail) {
        console.log("Outbound email already exists:", email.messageId);
        return existingEmail;
      }

      const savedEmail = await email_model_1.EmailModel.create(email);
      console.log("✅ Outbound email saved successfully:", savedEmail._id);
      return savedEmail;
    } catch (error) {
      console.error("❌ Error processing outbound email:", error);
      throw error;
    }
  }

  static async findOrCreateThreadId(threadId, subject, fromEmail) {
    try {
      console.log(
        "Finding or creating thread ID. Subject:",
        subject,
        "From:",
        fromEmail,
        "Initial threadId:",
        threadId
      );

      // If we have a threadId from headers, try to find existing emails with that threadId
      if (threadId) {
        const existingThread = await email_model_1.EmailModel.findOne(
          { threadId: threadId },
          { _id: 1 } // Only fetch _id for performance
        ).lean();

        if (existingThread) {
          console.log("Found existing thread with threadId:", threadId);
          return threadId;
        }
      }

      // If no existing thread found, use the provided threadId or generate a new one
      const finalThreadId = threadId || (0, uuid_1.v4)();
      console.log("Creating new thread with ID:", finalThreadId);
      return finalThreadId;
    } catch (error) {
      console.error("Error finding or creating thread ID:", error);
      return threadId || (0, uuid_1.v4)();
    }
  }

  static async getThreadInfo(threadId) {
    try {
      const emails = await email_model_1.EmailModel.find({ threadId: threadId }).sort({ receivedAt: 1 }).exec();

      if (emails.length === 0) {
        return null;
      }

      const originalEmail = emails[0];
      const latestEmail = emails[emails.length - 1];

      return {
        threadId: threadId,
        originalEmail: originalEmail,
        latestEmail: latestEmail,
        emailCount: emails.length,
        emails: emails,
        subject: originalEmail.subject,
        participants: [
          ...new Set(emails.flatMap((email) => [email.from.email, ...email.to.map((recipient) => recipient.email)])),
        ],
      };
    } catch (error) {
      console.error("Error getting thread info:", error);
      return null;
    }
  }

  static async updateEmailThreadReferences(emailId, threadId) {
    try {
      const email = await email_model_1.EmailModel.findById(emailId);
      if (!email) {
        console.error("Email not found:", emailId);
        return false;
      }

      email.threadId = threadId;
      await email.save();
      console.log("Updated email thread reference:", emailId, "->", threadId);
      return true;
    } catch (error) {
      console.error("Error updating email thread reference:", error);
      return false;
    }
  }

  static determineEmailStatusFlags(mail, textContent, htmlContent) {
    const subject = mail.commonHeaders.subject || "";
    const subjectLower = subject.toLowerCase();
    const content = (subject + " " + (textContent || "") + " " + (htmlContent || "")).toLowerCase();
    const headers = mail.headers || [];

    // Check for reply indicators
    const inReplyTo = headers.find((h) => h.name.toLowerCase() === "in-reply-to")?.value;
    const references = headers.find((h) => h.name.toLowerCase() === "references")?.value;
    const isReplied =
      subjectLower.includes("re:") || inReplyTo || references || content.includes("re:") || content.includes("reply");

    // Check for forward indicators
    const isForwarded =
      subjectLower.includes("fw:") ||
      subjectLower.includes("fwd:") ||
      subjectLower.includes("forwarded") ||
      content.includes("fw:") ||
      content.includes("forwarded") ||
      content.includes("forward") ||
      content.includes("original message");

    // Check for spam indicators
    const spamHeaders = ["x-spam-status", "x-spam-flag", "x-spam", "x-spam-score", "x-spam-level"];

    const spamHeader = headers.find((h) => spamHeaders.includes(h.name.toLowerCase()));
    const isSpam =
      subjectLower.includes("spam") ||
      content.includes("spam") ||
      (spamHeader &&
        (spamHeader.value.toLowerCase().includes("yes") ||
          spamHeader.value.toLowerCase().includes("spam") ||
          (spamHeader.name.toLowerCase() === "x-spam-score" && parseInt(spamHeader.value) > 5)));

    // Check for read status (default to false for new emails)
    const isRead = false;

    // Check for archived status (default to false for new emails)
    const isArchived = false;

    console.log("Status flags analysis:");
    console.log("- Subject:", subject);
    console.log("- IsReply:", isReplied, "(Re: in subject or reply headers)");
    console.log("- IsForwarded:", isForwarded, "(Fw: in subject or forward indicators)");
    console.log("- IsSpam:", isSpam, "(Spam headers or content)");
    console.log("- IsRead:", isRead, "(Default false for new emails)");
    console.log("- IsArchived:", isArchived, "(Default false for new emails)");

    return {
      isRead,
      isReplied,
      isForwarded,
      isArchived,
      isSpam,
    };
  }
}
exports.EmailProcessor = EmailProcessor;
