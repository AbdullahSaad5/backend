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
      console.log("Processing SES notification:", JSON.stringify(sesNotification, null, 2));
      let textContent = "";
      let htmlContent = "";
      let attachments = [];
      if (sesNotification.receipt?.action?.bucketName && sesNotification.receipt.action.objectKey) {
        const emailContent = await this.getEmailFromS3(
          sesNotification.receipt.action.bucketName,
          sesNotification.receipt.action.objectKey
        );
        const parsedEmail = await this.parseEmailContent(emailContent);
        textContent = parsedEmail.textContent;
        htmlContent = parsedEmail.htmlContent;
        attachments = parsedEmail.attachments;
      }
      const extractedThreadId = await this.extractThreadId(
        sesNotification.mail.headers,
        sesNotification.mail.commonHeaders.subject || "No Subject",
        sesNotification.mail.commonHeaders.from[0] || ""
      );

      const finalThreadId = await this.findOrCreateThreadId(
        extractedThreadId,
        sesNotification.mail.commonHeaders.subject || "No Subject",
        sesNotification.mail.commonHeaders.from[0] || ""
      );

      // Determine email status flags
      const statusFlags = this.determineEmailStatusFlags(sesNotification.mail, textContent, htmlContent);
      
      const email = {
        messageId: sesNotification.mail.messageId,
        threadId: finalThreadId,
        direction: email_model_1.EmailDirection.INBOUND,
        type: this.classifyEmailType(sesNotification.mail),
        status: email_model_1.EmailStatus.RECEIVED,
        priority: this.determinePriority(sesNotification.mail),
        subject: sesNotification.mail.commonHeaders.subject || "No Subject",
        textContent,
        htmlContent,
        from: this.parseEmailAddress(sesNotification.mail.commonHeaders.from[0] || ""),
        to: sesNotification.mail.commonHeaders.to.map((email) => this.parseEmailAddress(email)),
        cc: sesNotification.mail.commonHeaders.cc?.map((email) => this.parseEmailAddress(email)),
        bcc: sesNotification.mail.commonHeaders.bcc?.map((email) => this.parseEmailAddress(email)),
        replyTo: this.getReplyToAddress(sesNotification.mail.headers),
        headers: sesNotification.mail.headers,
        attachments,
        receivedAt: new Date(sesNotification.mail.timestamp),
        isRead: statusFlags.isRead,
        isReplied: statusFlags.isReplied,
        isForwarded: statusFlags.isForwarded,
        isArchived: statusFlags.isArchived,
        isSpam: statusFlags.isSpam,
        tags: this.extractTags(sesNotification.mail),
        category: this.categorizeEmail(sesNotification.mail),
        amazonOrderId: this.extractAmazonOrderId(sesNotification.mail),
        amazonBuyerId: this.extractAmazonBuyerId(sesNotification.mail),
        ebayItemId: this.extractEbayItemId(sesNotification.mail),
        rawEmailData: {
          sesNotification,
          processingTimestamp: new Date().toISOString(),
        },
      };
      const existingEmail = await email_model_1.EmailModel.findOne({ messageId: email.messageId }).exec();
      if (existingEmail) {
        console.log("Email already exists:", email.messageId);
        return existingEmail;
      }
      const savedEmail = await email_model_1.EmailModel.create(email);
      console.log("✅ Email saved successfully:", savedEmail._id);
      await this.processEmailRules(savedEmail);
      return savedEmail;
    } catch (error) {
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
    static async extractThreadId(headers, subject, fromEmail) {
    const messageIdHeader = headers.find((h) => h.name.toLowerCase() === "message-id");
    const inReplyToHeader = headers.find((h) => h.name.toLowerCase() === "in-reply-to");
    const referencesHeader = headers.find((h) => h.name.toLowerCase() === "references");
    
    let threadId = null;
    let isReply = false;
    
    // Check if this is a reply
    const subjectLower = subject ? subject.toLowerCase() : "";
    isReply = subjectLower.includes("re:") || inReplyToHeader || referencesHeader;
    
    console.log("Email analysis - Subject:", subject, "IsReply:", isReply);
    
    // Only try to find existing thread if this is actually a reply
    if (isReply) {
      // First, try to extract thread ID from email headers
      if (referencesHeader) {
        const references = referencesHeader.value.split(/\s+/);
        const refMatch = references[0].match(/<(.+?)>/);
        threadId = refMatch ? refMatch[1] : references[0];
        console.log("Using thread ID from References:", threadId);
      } else if (inReplyToHeader) {
        const replyMatch = inReplyToHeader.value.match(/<(.+?)>/);
        threadId = replyMatch ? replyMatch[1] : inReplyToHeader.value;
        console.log("Using thread ID from In-Reply-To:", threadId);
      }
      
      // Clean up thread ID (remove angle brackets and normalize)
      if (threadId) {
        threadId = threadId.replace(/[<>]/g, "").trim();
      }
      
      // If this is a reply, try to find existing thread
      if (subject && subject.toLowerCase().includes("re:")) {
        const cleanSubject = subject.replace(/^re:\s*/i, "").trim();
        console.log("Looking for existing thread with clean subject:", cleanSubject);
        
        try {
          const existingEmail = await email_model_1.EmailModel.findOne({
            subject: { $regex: cleanSubject, $options: "i" },
            "from.email": fromEmail,
          }).sort({ receivedAt: -1 });
          
          if (existingEmail && existingEmail.threadId) {
            console.log("Found existing thread:", existingEmail.threadId);
            return existingEmail.threadId;
          }
        } catch (error) {
          console.error("Error looking up existing thread:", error);
        }
      }
      
      // If we have a threadId from headers, use it
      if (threadId) {
        console.log("Using thread ID from headers:", threadId);
        return threadId;
      }
    }
    
    // For new threads (not replies), use the current message ID as thread ID
    if (messageIdHeader) {
      threadId = messageIdHeader.value.replace(/[<>]/g, "").trim();
      console.log("Creating new thread with message ID:", threadId);
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
    if (fromEmail.includes("amazon")) return "amazon";
    if (fromEmail.includes("ebay")) return "ebay";
    if (fromEmail.includes("support")) return "support";
    if (fromEmail.includes("noreply") || fromEmail.includes("no-reply")) return "automated";
    return "general";
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
            from: [emailData.from?.email || ""]
          },
          headers: emailData.headers || []
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

      // If this is a reply (subject contains "Re:"), try to find existing thread
      if (subject && subject.toLowerCase().includes("re:")) {
        const cleanSubject = subject.replace(/^re:\s*/i, "").trim();
        console.log("Looking for existing thread with clean subject:", cleanSubject);

        const existingEmail = await email_model_1.EmailModel.findOne({
          subject: { $regex: cleanSubject, $options: "i" },
          "from.email": fromEmail,
        }).sort({ receivedAt: -1 });

        if (existingEmail && existingEmail.threadId) {
          console.log("Found existing thread:", existingEmail.threadId);
          return existingEmail.threadId;
        }
      }

      // If we have a threadId from headers, try to find existing emails with that threadId
      if (threadId) {
        const existingThread = await email_model_1.EmailModel.findOne({
          threadId: threadId,
        });

        if (existingThread) {
          console.log("Found existing thread with threadId:", threadId);
          return threadId;
        }
      }

      // If no existing thread found, use the provided threadId or generate a new one
      return threadId || (0, uuid_1.v4)();
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
    const inReplyTo = headers.find(h => h.name.toLowerCase() === "in-reply-to")?.value;
    const references = headers.find(h => h.name.toLowerCase() === "references")?.value;
    const isReplied = subjectLower.includes("re:") || inReplyTo || references || content.includes("re:") || content.includes("reply");
    
    // Check for forward indicators
    const isForwarded = subjectLower.includes("fw:") || 
                       subjectLower.includes("fwd:") || 
                       subjectLower.includes("forwarded") || 
                       content.includes("fw:") || 
                       content.includes("forwarded") || 
                       content.includes("forward") ||
                       content.includes("original message");
    
    // Check for spam indicators
    const spamHeaders = [
      "x-spam-status",
      "x-spam-flag", 
      "x-spam",
      "x-spam-score",
      "x-spam-level"
    ];
    
    const spamHeader = headers.find(h => spamHeaders.includes(h.name.toLowerCase()));
    const isSpam = subjectLower.includes("spam") || 
                   content.includes("spam") ||
                   (spamHeader && (
                     spamHeader.value.toLowerCase().includes("yes") ||
                     spamHeader.value.toLowerCase().includes("spam") ||
                     (spamHeader.name.toLowerCase() === "x-spam-score" && parseInt(spamHeader.value) > 5)
                   ));
    
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
      isSpam
    };
  }
}
exports.EmailProcessor = EmailProcessor;
