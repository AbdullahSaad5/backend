const mongoose = require("mongoose");
const { EmailModel, EmailDirection, EmailStatus, EmailType, EmailPriority } = require("./models/email.model");
const AWS = require("aws-sdk");

// Cache the DB connection
let cachedDb = null;

const connectToDatabase = async () => {
  if (cachedDb && cachedDb.connection.readyState === 1) {
    return cachedDb;
  }
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  try {
    const db = await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    cachedDb = db;
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

// Function to read email data from S3
const readEmailFromS3 = async (bucketName, objectKey) => {
  const s3 = new AWS.S3();
  try {
    console.log(`Reading email from S3: ${bucketName}/${objectKey}`);
    const response = await s3
      .getObject({
        Bucket: bucketName,
        Key: objectKey,
      })
      .promise();

    const emailContent = response.Body.toString("utf-8");
    console.log("Raw email content length:", emailContent.length);

    // Parse the email content (this is a raw email, not JSON)
    return parseRawEmail(emailContent, objectKey);
  } catch (error) {
    console.error("Error reading from S3:", error);

    // Handle specific S3 errors
    if (error.code === "NoSuchKey") {
      console.error(`S3 object not found: ${bucketName}/${objectKey}`);
      throw new Error(`Email file not found in S3: ${objectKey}`);
    } else if (error.code === "AccessDenied") {
      console.error(`Access denied to S3 object: ${bucketName}/${objectKey}`);
      throw new Error(`Access denied to email file: ${objectKey}`);
    } else {
      console.error(`S3 error: ${error.code} - ${error.message}`);
      throw new Error(`Failed to read email from S3: ${error.message}`);
    }
  }
};

// Function to parse raw email content
const parseRawEmail = (rawEmail, objectKey) => {
  try {
    // Split the email into headers and body
    const parts = rawEmail.split("\r\n\r\n");
    const headers = parts[0];
    const body = parts.slice(1).join("\r\n\r\n");

    // Parse headers
    const headerLines = headers.split("\r\n");
    const headerMap = {};

    for (const line of headerLines) {
      if (line.includes(":")) {
        const [key, ...valueParts] = line.split(":");
        const value = valueParts.join(":").trim();
        headerMap[key.toLowerCase()] = value;
      }
    }

    // Extract email data
    const from = headerMap["from"] || "";
    const to = headerMap["to"] || "";
    const cc = headerMap["cc"] || "";
    const bcc = headerMap["bcc"] || "";
    const subject = headerMap["subject"] || "No Subject";
    const messageId = headerMap["message-id"] || objectKey;
    const inReplyTo = headerMap["in-reply-to"] || "";
    const references = headerMap["references"] || "";
    const replyTo = headerMap["reply-to"] || "";
    const date = headerMap["date"] || new Date().toISOString();

    // Parse from and to addresses
    const fromMatch = from.match(/<(.+?)>/);
    const fromEmail = fromMatch ? fromMatch[1] : from;
    const fromNameMatch = from.match(/(.+?)\s*</);
    const fromName = fromNameMatch ? fromNameMatch[1].trim() : "";

    // Parse to addresses
    const toEmails = to
      .split(",")
      .map((email) => {
        const match = email.trim().match(/<(.+?)>/);
        const nameMatch = email.trim().match(/(.+?)\s*</);
        return {
          email: match ? match[1] : email.trim(),
          name: nameMatch ? nameMatch[1].trim() : "",
        };
      })
      .filter((email) => email.email);

    // Parse cc addresses
    const ccEmails = cc
      ? cc
          .split(",")
          .map((email) => {
            const match = email.trim().match(/<(.+?)>/);
            const nameMatch = email.trim().match(/(.+?)\s*</);
            return {
              email: match ? match[1] : email.trim(),
              name: nameMatch ? nameMatch[1].trim() : "",
            };
          })
          .filter((email) => email.email)
      : [];

    // Parse bcc addresses
    const bccEmails = bcc
      ? bcc
          .split(",")
          .map((email) => {
            const match = email.trim().match(/<(.+?)>/);
            const nameMatch = email.trim().match(/(.+?)\s*</);
            return {
              email: match ? match[1] : email.trim(),
              name: nameMatch ? nameMatch[1].trim() : "",
            };
          })
          .filter((email) => email.email)
      : [];

    // Parse reply-to
    let replyToData = null;
    if (replyTo) {
      const replyToMatch = replyTo.match(/<(.+?)>/);
      const replyToNameMatch = replyTo.match(/(.+?)\s*</);
      replyToData = {
        email: replyToMatch ? replyToMatch[1] : replyTo,
        name: replyToNameMatch ? replyToNameMatch[1].trim() : "",
      };
    }

    // Extract thread ID from references or in-reply-to
    let threadId = null;
    console.log(
      "Extracting thread ID from - References:",
      references,
      "In-Reply-To:",
      inReplyTo,
      "Message-ID:",
      messageId
    );

    if (references) {
      // Use the first message ID in references as thread ID
      const refMatch = references.match(/<(.+?)>/);
      threadId = refMatch ? refMatch[1] : references;
      console.log("Using thread ID from References:", threadId);
    } else if (inReplyTo) {
      // Use in-reply-to as thread ID
      const replyMatch = inReplyTo.match(/<(.+?)>/);
      threadId = replyMatch ? replyMatch[1] : inReplyTo;
      console.log("Using thread ID from In-Reply-To:", threadId);
    } else {
      // For new threads, use the current message ID as thread ID
      threadId = messageId.replace(/[<>]/g, "");
      console.log("Using current message ID as thread ID:", threadId);
    }

    // Clean up thread ID (remove angle brackets and normalize)
    threadId = threadId.replace(/[<>]/g, "").trim();
    console.log("Final thread ID:", threadId);

    // Parse email body to extract text and HTML content
    const contentType = headerMap["content-type"] || "";
    let textContent = "";
    let htmlContent = "";

    if (contentType.includes("multipart/alternative") || contentType.includes("multipart/mixed")) {
      // Parse multipart content
      const boundaryMatch = contentType.match(/boundary="(.+?)"/);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const parts = body.split(`--${boundary}`);

        for (const part of parts) {
          if (part.includes("Content-Type: text/plain")) {
            const textMatch = part.match(/Content-Type: text\/plain[^]*?\r\n\r\n([^]*?)(?=--|$)/);
            if (textMatch) {
              textContent = textMatch[1].trim();
            }
          } else if (part.includes("Content-Type: text/html")) {
            const htmlMatch = part.match(/Content-Type: text\/html[^]*?\r\n\r\n([^]*?)(?=--|$)/);
            if (htmlMatch) {
              htmlContent = htmlMatch[1].trim();
            }
          }
        }
      }
    } else if (contentType.includes("text/plain")) {
      textContent = body;
    } else if (contentType.includes("text/html")) {
      htmlContent = body;
    }

    // Convert all headers to the expected format
    const headersArray = Object.entries(headerMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Determine email type based on content and sender
    const emailType = classifyEmailType(fromEmail);

    // Determine priority based on subject and content
    const priority = determinePriority(subject);

    // Extract Amazon and eBay specific information
    const amazonInfo = extractAmazonInfo(textContent, htmlContent, headersArray);
    const ebayInfo = extractEbayInfo(textContent, htmlContent, headersArray);

    // Determine category and generate tags
    const category = determineEmailCategory(fromEmail, subject, textContent, htmlContent);
    const tags = generateTags(subject, textContent, htmlContent, fromEmail);

    // Analyze email content to determine status flags
    const content = (subject + " " + textContent + " " + htmlContent).toLowerCase();
    const subjectLower = subject.toLowerCase();

    // More robust reply detection
    const isReplied =
      subjectLower.includes("re:") ||
      inReplyTo ||
      references ||
      content.includes("re:") ||
      content.includes("reply") ||
      content.includes("replied");

    // More robust forward detection
    const isForwarded =
      subjectLower.includes("fw:") ||
      subjectLower.includes("fwd:") ||
      subjectLower.includes("forwarded") ||
      content.includes("fw:") ||
      content.includes("forwarded") ||
      content.includes("forward");

    // More robust spam detection
    const isSpam =
      subjectLower.includes("spam") ||
      content.includes("spam") ||
      headerMap["x-spam-status"] === "Yes" ||
      headerMap["x-spam-flag"] === "YES" ||
      headerMap["x-spam"] === "YES" ||
      headerMap["x-spam-score"] > 5;

    const isArchived = false; // Will be set by user action
    const isRead = false; // Will be set when user reads the email

    console.log("Status flags - isReplied:", isReplied, "isForwarded:", isForwarded, "isSpam:", isSpam);
    console.log("Subject:", subject, "InReplyTo:", inReplyTo, "References:", references);

    return {
      messageId: messageId.replace(/[<>]/g, ""),
      threadId: threadId,
      direction: EmailDirection.INBOUND,
      type: emailType,
      status: EmailStatus.RECEIVED,
      priority: priority,
      subject: subject,
      textContent: textContent,
      htmlContent: htmlContent,
      from: {
        email: fromEmail,
        name: fromName,
      },
      to: toEmails,
      cc: ccEmails,
      bcc: bccEmails,
      replyTo: replyToData,
      headers: headersArray,
      attachments: [], // Will be populated if attachments are found
      amazonOrderId: amazonInfo.amazonOrderId,
      amazonBuyerId: amazonInfo.amazonBuyerId,
      amazonMarketplace: amazonInfo.amazonMarketplace,
      amazonASIN: amazonInfo.amazonASIN,
      ebayItemId: ebayInfo.ebayItemId,
      ebayTransactionId: ebayInfo.ebayTransactionId,
      ebayBuyerId: ebayInfo.ebayBuyerId,
      receivedAt: new Date(date),
      processedAt: new Date(), // Set to current time when processed
      sentAt: null, // Not applicable for inbound emails
      readAt: null, // Will be set when email is read
      isRead: isRead,
      isReplied: isReplied,
      isForwarded: isForwarded,
      isArchived: isArchived,
      isSpam: isSpam,
      tags: tags,
      category: category,
      labels: [], // Will be populated based on rules
      assignedTo: null, // Will be assigned by user
      assignedAt: null, // Will be set when assigned
      relatedOrderId: null, // Will be linked if order found
      relatedCustomerId: null, // Will be linked if customer found
      relatedTicketId: null, // Will be linked if ticket found
      rawEmailData: rawEmail,
    };
  } catch (error) {
    console.error("Error parsing raw email:", error);
    // Fallback: create basic email data
    return {
      messageId: objectKey,
      threadId: objectKey,
      subject: "No Subject",
      from: { email: "unknown@example.com", name: "" },
      to: [{ email: "unknown@example.com", name: "" }],
      direction: EmailDirection.INBOUND,
      type: EmailType.GENERAL,
      status: EmailStatus.RECEIVED,
      priority: EmailPriority.NORMAL,
      receivedAt: new Date(),
      processedAt: new Date(),
      sentAt: null,
      readAt: null,
      isRead: false,
      isReplied: false,
      isForwarded: false,
      isArchived: false,
      isSpam: false,
      tags: [],
      category: null,
      labels: [],
      assignedTo: null,
      assignedAt: null,
      relatedOrderId: null,
      relatedCustomerId: null,
      relatedTicketId: null,
      rawEmailData: rawEmail,
    };
  }
};

// Function to extract Amazon-specific information from email content
const extractAmazonInfo = (textContent, htmlContent, headers) => {
  const content = (textContent + " " + htmlContent).toLowerCase();
  const headerContent = headers
    .map((h) => h.value)
    .join(" ")
    .toLowerCase();
  const fullContent = content + " " + headerContent;

  const amazonInfo = {
    amazonOrderId: null,
    amazonBuyerId: null,
    amazonMarketplace: null,
    amazonASIN: null,
  };

  // Extract Amazon Order ID (various patterns)
  const orderIdPatterns = [
    /order[:\s]*([0-9]{3}-[0-9]{7}-[0-9]{7})/i,
    /order[:\s]*([0-9]{10,})/i,
    /amazon.*order[:\s]*([0-9-]+)/i,
  ];

  for (const pattern of orderIdPatterns) {
    const match = fullContent.match(pattern);
    if (match) {
      amazonInfo.amazonOrderId = match[1];
      break;
    }
  }

  // Extract ASIN (Amazon Standard Identification Number)
  const asinPattern = /asin[:\s]*([A-Z0-9]{10})/i;
  const asinMatch = fullContent.match(asinPattern);
  if (asinMatch) {
    amazonInfo.amazonASIN = asinMatch[1];
  }

  // Determine marketplace based on sender or content
  if (fullContent.includes("amazon.co.uk") || fullContent.includes("uk marketplace")) {
    amazonInfo.amazonMarketplace = "UK";
  } else if (fullContent.includes("amazon.com") || fullContent.includes("us marketplace")) {
    amazonInfo.amazonMarketplace = "US";
  } else if (fullContent.includes("amazon.de") || fullContent.includes("german marketplace")) {
    amazonInfo.amazonMarketplace = "DE";
  }

  return amazonInfo;
};

// Function to extract eBay-specific information from email content
const extractEbayInfo = (textContent, htmlContent, headers) => {
  const content = (textContent + " " + htmlContent).toLowerCase();
  const headerContent = headers
    .map((h) => h.value)
    .join(" ")
    .toLowerCase();
  const fullContent = content + " " + headerContent;

  const ebayInfo = {
    ebayItemId: null,
    ebayTransactionId: null,
    ebayBuyerId: null,
  };

  // Extract eBay Item ID
  const itemIdPattern = /item[:\s]*([0-9]{12})/i;
  const itemMatch = fullContent.match(itemIdPattern);
  if (itemMatch) {
    ebayInfo.ebayItemId = itemMatch[1];
  }

  // Extract Transaction ID
  const transactionPattern = /transaction[:\s]*([0-9]{19})/i;
  const transactionMatch = fullContent.match(transactionPattern);
  if (transactionMatch) {
    ebayInfo.ebayTransactionId = transactionMatch[1];
  }

  return ebayInfo;
};

// Function to determine email category based on content and sender
const determineEmailCategory = (fromEmail, subject, textContent, htmlContent) => {
  const content = (textContent + " " + htmlContent).toLowerCase();
  const fromLower = fromEmail.toLowerCase();
  const subjectLower = subject.toLowerCase();

  if (fromLower.includes("amazon") || content.includes("amazon") || subjectLower.includes("amazon")) {
    return "amazon";
  }
  if (fromLower.includes("ebay") || content.includes("ebay") || subjectLower.includes("ebay")) {
    return "ebay";
  }
  if (subjectLower.includes("support") || subjectLower.includes("help") || fromLower.includes("support")) {
    return "support";
  }
  if (subjectLower.includes("order") || content.includes("order confirmation")) {
    return "order";
  }
  if (subjectLower.includes("invoice") || content.includes("invoice")) {
    return "invoice";
  }
  if (subjectLower.includes("newsletter") || subjectLower.includes("marketing")) {
    return "marketing";
  }

  return "general";
};

// Function to generate tags based on email content
const generateTags = (subject, textContent, htmlContent, fromEmail) => {
  const tags = [];
  const content = (subject + " " + textContent + " " + htmlContent).toLowerCase();
  const fromLower = fromEmail.toLowerCase();

  // Add tags based on content keywords
  if (content.includes("urgent") || content.includes("asap")) {
    tags.push("urgent");
  }
  if (content.includes("order") || content.includes("purchase")) {
    tags.push("order");
  }
  if (content.includes("support") || content.includes("help")) {
    tags.push("support");
  }
  if (content.includes("invoice") || content.includes("payment")) {
    tags.push("invoice");
  }
  if (fromLower.includes("amazon")) {
    tags.push("amazon");
  }
  if (fromLower.includes("ebay")) {
    tags.push("ebay");
  }
  if (content.includes("refund") || content.includes("return")) {
    tags.push("refund");
  }

  return tags;
};

// Function to check for existing thread and get consistent thread ID
const getConsistentThreadId = async (threadId, subject, fromEmail) => {
  try {
    console.log("Checking for existing thread. Subject:", subject, "From:", fromEmail, "Initial threadId:", threadId);

    // Check if this email is a reply to an existing thread
    if (subject.toLowerCase().includes("re:")) {
      // Look for existing emails with similar subject (without "Re:")
      const cleanSubject = subject.replace(/^re:\s*/i, "").trim();
      console.log("Looking for existing thread with clean subject:", cleanSubject);

      const existingEmail = await EmailModel.findOne({
        subject: { $regex: cleanSubject, $options: "i" },
        "from.email": fromEmail,
      }).sort({ receivedAt: -1 });

      if (existingEmail && existingEmail.threadId) {
        console.log("Found existing thread:", existingEmail.threadId);
        return existingEmail.threadId;
      } else {
        console.log("No existing thread found, using original threadId:", threadId);
      }
    }

    // If no existing thread found, use the provided threadId
    return threadId;
  } catch (error) {
    console.error("Error checking for existing thread:", error);
    return threadId;
  }
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Log the event structure for debugging
    console.log("Event structure:", JSON.stringify(event, null, 2));

    await connectToDatabase();

    // Validate event structure
    if (!event || !event.Records || !Array.isArray(event.Records)) {
      throw new Error("Invalid event structure: missing or invalid Records array");
    }

    console.log("Processing", event.Records.length, "records");

    for (const record of event.Records) {
      try {
        // Validate record structure
        if (!record) {
          console.error("Record is null or undefined");
          continue;
        }

        console.log("Processing record:", JSON.stringify(record, null, 2));

        // Check if this is an S3 event
        if (record.eventSource === "aws:s3" && record.s3) {
          console.log("Processing S3 event");
          const bucketName = record.s3.bucket.name;
          const objectKey = record.s3.object.key;

          // Skip test events that reference non-existent objects
          if (objectKey.includes("test-") || objectKey.includes("example")) {
            console.log(`Skipping test event with object key: ${objectKey}`);
            continue;
          }

          try {
            // Read email from S3
            const emailData = await readEmailFromS3(bucketName, objectKey);

            // Get consistent thread ID
            const consistentThreadId = await getConsistentThreadId(
              emailData.threadId,
              emailData.subject,
              emailData.from.email
            );
            emailData.threadId = consistentThreadId;

            // Avoid duplicates
            const existingEmail = await EmailModel.findOne({ messageId: emailData.messageId });
            if (!existingEmail) {
              console.log("Creating email with data:", {
                messageId: emailData.messageId,
                threadId: emailData.threadId,
                subject: emailData.subject,
                isReplied: emailData.isReplied,
                isForwarded: emailData.isForwarded,
                isSpam: emailData.isSpam,
                isRead: emailData.isRead,
                isArchived: emailData.isArchived,
              });
              await EmailModel.create(emailData);
              console.log("Email saved from S3:", emailData.messageId, "Thread ID:", emailData.threadId);
            } else {
              console.log("Duplicate email from S3:", emailData.messageId);
            }
          } catch (s3Error) {
            console.error(`Failed to process S3 event for ${bucketName}/${objectKey}:`, s3Error.message);
            // Continue processing other records instead of failing the entire batch
            continue;
          }
        }
        // Check if this is an SNS record
        else if (record.Sns) {
          console.log("Processing SNS event");

          if (!record.Sns.Message) {
            console.error("SNS record does not contain Message:", record.Sns);
            continue;
          }

          const sesNotification = JSON.parse(record.Sns.Message);
          console.log("Parsed SES notification:", JSON.stringify(sesNotification, null, 2));

          if (sesNotification.eventType === "receipt") {
            const mail = sesNotification.mail;

            // Validate mail object
            if (!mail || !mail.messageId || !mail.commonHeaders) {
              console.error("Invalid mail object in SES notification:", mail);
              continue;
            }

            // Extract thread information from headers
            const headers = mail.headers || [];
            const references = headers.find((h) => h.name === "References")?.value || "";
            const inReplyTo = headers.find((h) => h.name === "In-Reply-To")?.value || "";

            // Determine thread ID with improved logic
            let threadId = mail.messageId;
            console.log(
              "SNS - Extracting thread ID from - References:",
              references,
              "In-Reply-To:",
              inReplyTo,
              "Message-ID:",
              mail.messageId
            );

            if (references) {
              const refMatch = references.match(/<(.+?)>/);
              threadId = refMatch ? refMatch[1] : references;
              console.log("SNS - Using thread ID from References:", threadId);
            } else if (inReplyTo) {
              const replyMatch = inReplyTo.match(/<(.+?)>/);
              threadId = replyMatch ? replyMatch[1] : inReplyTo;
              console.log("SNS - Using thread ID from In-Reply-To:", threadId);
            }

            // Clean up thread ID
            threadId = threadId.replace(/[<>]/g, "").trim();
            console.log("SNS - Final thread ID:", threadId);

            // Parse email addresses with names
            const fromEmail = mail.commonHeaders.from[0];
            const fromMatch = fromEmail.match(/<(.+?)>/);
            const fromNameMatch = fromEmail.match(/(.+?)\s*</);

            // Extract Amazon and eBay specific information (for SNS, we have limited content)
            const amazonInfo = extractAmazonInfo("", "", headers);
            const ebayInfo = extractEbayInfo("", "", headers);

            // Determine category and generate tags
            const category = determineEmailCategory(
              fromMatch ? fromMatch[1] : fromEmail,
              mail.commonHeaders.subject || "",
              "",
              ""
            );
            const tags = generateTags(mail.commonHeaders.subject || "", "", "", fromMatch ? fromMatch[1] : fromEmail);

            // Analyze email content to determine status flags
            const subject = mail.commonHeaders.subject || "";
            const subjectLower = subject.toLowerCase();

            // More robust reply detection for SNS
            const isReplied =
              subjectLower.includes("re:") ||
              inReplyTo ||
              references ||
              subjectLower.includes("reply") ||
              subjectLower.includes("replied");

            // More robust forward detection for SNS
            const isForwarded =
              subjectLower.includes("fw:") || subjectLower.includes("fwd:") || subjectLower.includes("forwarded");

            // More robust spam detection for SNS
            const isSpam =
              subjectLower.includes("spam") ||
              headers.find((h) => h.name === "X-Spam-Status")?.value === "Yes" ||
              headers.find((h) => h.name === "X-Spam-Flag")?.value === "YES" ||
              headers.find((h) => h.name === "X-Spam")?.value === "YES";

            const isArchived = false; // Will be set by user action
            const isRead = false; // Will be set when user reads the email

            console.log("SNS Status flags - isReplied:", isReplied, "isForwarded:", isForwarded, "isSpam:", isSpam);
            console.log("SNS Subject:", subject, "InReplyTo:", inReplyTo, "References:", references);

            const emailData = {
              messageId: mail.messageId,
              threadId: threadId,
              direction: EmailDirection.INBOUND,
              type: classifyEmailType(fromMatch ? fromMatch[1] : fromEmail),
              status: EmailStatus.RECEIVED,
              priority: determinePriority(mail.commonHeaders.subject),
              subject: mail.commonHeaders.subject || "No Subject",
              textContent: "", // Will be populated if available in SES notification
              htmlContent: "", // Will be populated if available in SES notification
              from: {
                email: fromMatch ? fromMatch[1] : fromEmail,
                name: fromNameMatch ? fromNameMatch[1].trim() : "",
              },
              to: mail.commonHeaders.to.map((email) => {
                const match = email.match(/<(.+?)>/);
                const nameMatch = email.match(/(.+?)\s*</);
                return {
                  email: match ? match[1] : email,
                  name: nameMatch ? nameMatch[1].trim() : "",
                };
              }),
              cc: (mail.commonHeaders.cc || []).map((email) => {
                const match = email.match(/<(.+?)>/);
                const nameMatch = email.match(/(.+?)\s*</);
                return {
                  email: match ? match[1] : email,
                  name: nameMatch ? nameMatch[1].trim() : "",
                };
              }),
              bcc: (mail.commonHeaders.bcc || []).map((email) => {
                const match = email.match(/<(.+?)>/);
                const nameMatch = email.match(/(.+?)\s*</);
                return {
                  email: match ? match[1] : email,
                  name: nameMatch ? nameMatch[1].trim() : "",
                };
              }),
              replyTo: null, // Will be populated if available
              headers: headers.map((h) => ({ name: h.name, value: h.value })),
              attachments: [], // Will be populated if attachments are found
              amazonOrderId: amazonInfo.amazonOrderId,
              amazonBuyerId: amazonInfo.amazonBuyerId,
              amazonMarketplace: amazonInfo.amazonMarketplace,
              amazonASIN: amazonInfo.amazonASIN,
              ebayItemId: ebayInfo.ebayItemId,
              ebayTransactionId: ebayInfo.ebayTransactionId,
              ebayBuyerId: ebayInfo.ebayBuyerId,
              receivedAt: new Date(mail.timestamp),
              processedAt: new Date(), // Set to current time when processed
              sentAt: null, // Not applicable for inbound emails
              readAt: null, // Will be set when email is read
              isRead: isRead,
              isReplied: isReplied,
              isForwarded: isForwarded,
              isArchived: isArchived,
              isSpam: isSpam,
              tags: tags,
              category: category,
              labels: [], // Will be populated based on rules
              assignedTo: null, // Will be assigned by user
              assignedAt: null, // Will be set when assigned
              relatedOrderId: null, // Will be linked if order found
              relatedCustomerId: null, // Will be linked if customer found
              relatedTicketId: null, // Will be linked if ticket found
              rawEmailData: JSON.stringify(sesNotification), // Store the SES notification
            };

            // Get consistent thread ID
            const consistentThreadId = await getConsistentThreadId(
              emailData.threadId,
              emailData.subject,
              emailData.from.email
            );
            emailData.threadId = consistentThreadId;

            // Avoid duplicates
            const existingEmail = await EmailModel.findOne({ messageId: emailData.messageId });
            if (!existingEmail) {
              console.log("Creating SNS email with data:", {
                messageId: emailData.messageId,
                threadId: emailData.threadId,
                subject: emailData.subject,
                isReplied: emailData.isReplied,
                isForwarded: emailData.isForwarded,
                isSpam: emailData.isSpam,
                isRead: emailData.isRead,
                isArchived: emailData.isArchived,
              });
              await EmailModel.create(emailData);
              console.log("Email saved from SNS:", emailData.messageId, "Thread ID:", emailData.threadId);
            } else {
              console.log("Duplicate email from SNS:", emailData.messageId);
            }
          } else {
            console.log("Skipping non-receipt event:", sesNotification.eventType);
          }
        } else {
          console.error("Record does not contain S3 or SNS data:", record);
        }
      } catch (recordError) {
        console.error("Error processing record:", recordError);
        console.error("Record that caused error:", JSON.stringify(record, null, 2));
      }
    }
  } catch (error) {
    console.error("Error processing emails:", error);
    throw error; // Re-throw to ensure Lambda marks the invocation as failed
  }
};

const classifyEmailType = (from) => {
  const emailLower = from.toLowerCase();
  const domain = emailLower.split("@")[1] || "";

  // Check for specific domains
  if (domain.includes("amazon") || domain.includes("amzn")) {
    return EmailType.AMAZON_ORDER;
  }
  if (domain.includes("ebay") || domain.includes("ebay.com")) {
    return EmailType.EBAY_MESSAGE;
  }
  if (domain.includes("support") || domain.includes("help")) {
    return EmailType.SUPPORT;
  }
  if (domain.includes("marketing") || domain.includes("newsletter")) {
    return EmailType.MARKETING;
  }
  if (domain.includes("system") || domain.includes("noreply") || domain.includes("no-reply")) {
    return EmailType.SYSTEM;
  }

  return EmailType.GENERAL;
};

const determinePriority = (subject) => {
  const subjLower = subject.toLowerCase();

  // High priority keywords
  if (subjLower.includes("urgent") || subjLower.includes("asap") || subjLower.includes("emergency")) {
    return EmailPriority.URGENT;
  }

  // High priority keywords
  if (subjLower.includes("important") || subjLower.includes("critical") || subjLower.includes("priority")) {
    return EmailPriority.HIGH;
  }

  // Low priority keywords
  if (subjLower.includes("newsletter") || subjLower.includes("marketing") || subjLower.includes("promotion")) {
    return EmailPriority.LOW;
  }

  return EmailPriority.NORMAL;
};

console.log("Lambda initialized");
