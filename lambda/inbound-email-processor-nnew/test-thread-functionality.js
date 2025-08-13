const mongoose = require("mongoose");
const { EmailModel, EmailDirection, EmailStatus, EmailType, EmailPriority } = require("./src/models/email.model");
const { EmailProcessor } = require("./src/services/emailProcessor");

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/email-processor-test";

async function testThreadFunctionality() {
  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clean up existing test data
    await EmailModel.deleteMany({ subject: { $regex: /^Test Thread/ } });
    console.log("🧹 Cleaned up existing test data");

    // Test 1: Create original email
    console.log("\n📧 Test 1: Creating original email");
    const originalEmailData = {
      messageId: "test-original-123@example.com",
      subject: "Test Thread: Original Message",
      from: { email: "sender@example.com", name: "Test Sender" },
      to: [{ email: "recipient@example.com", name: "Test Recipient" }],
      textContent: "This is the original message",
      headers: [
        { name: "Message-ID", value: "<test-original-123@example.com>" },
        { name: "Subject", value: "Test Thread: Original Message" },
      ],
    };

    const originalEmail = await EmailProcessor.processOutboundEmail(originalEmailData);
    console.log("✅ Original email created with threadId:", originalEmail.threadId);

    // Test 2: Create reply to original email
    console.log("\n📧 Test 2: Creating reply to original email");
    const replyEmailData = {
      messageId: "test-reply-456@example.com",
      subject: "Re: Test Thread: Original Message",
      from: { email: "recipient@example.com", name: "Test Recipient" },
      to: [{ email: "sender@example.com", name: "Test Sender" }],
      textContent: "This is a reply to the original message",
      headers: [
        { name: "Message-ID", value: "<test-reply-456@example.com>" },
        { name: "In-Reply-To", value: "<test-original-123@example.com>" },
        { name: "References", value: "<test-original-123@example.com>" },
        { name: "Subject", value: "Re: Test Thread: Original Message" },
      ],
    };

    const replyEmail = await EmailProcessor.processInboundEmail({
      mail: {
        messageId: replyEmailData.messageId,
        commonHeaders: {
          subject: replyEmailData.subject,
          from: [replyEmailData.from.email],
          to: replyEmailData.to.map((t) => t.email),
        },
        headers: replyEmailData.headers,
        timestamp: new Date().toISOString(),
      },
    });
    console.log("✅ Reply email created with threadId:", replyEmail.threadId);

    // Test 3: Create another reply
    console.log("\n📧 Test 3: Creating another reply");
    const secondReplyData = {
      messageId: "test-reply-789@example.com",
      subject: "Re: Test Thread: Original Message",
      from: { email: "sender@example.com", name: "Test Sender" },
      to: [{ email: "recipient@example.com", name: "Test Recipient" }],
      textContent: "This is another reply in the same thread",
      headers: [
        { name: "Message-ID", value: "<test-reply-789@example.com>" },
        { name: "In-Reply-To", value: "<test-reply-456@example.com>" },
        { name: "References", value: "<test-original-123@example.com> <test-reply-456@example.com>" },
        { name: "Subject", value: "Re: Test Thread: Original Message" },
      ],
    };

    const secondReply = await EmailProcessor.processOutboundEmail(secondReplyData);
    console.log("✅ Second reply created with threadId:", secondReply.threadId);

    // Test 4: Verify all emails are in the same thread
    console.log("\n📧 Test 4: Verifying thread consistency");
    const threadEmails = await EmailModel.find({
      subject: { $regex: /^Test Thread/ },
    }).sort({ receivedAt: 1 });

    console.log("📊 Thread analysis:");
    console.log("- Total emails in thread:", threadEmails.length);

    const threadIds = [...new Set(threadEmails.map((email) => email.threadId))];
    console.log("- Unique thread IDs:", threadIds);

    if (threadIds.length === 1) {
      console.log("✅ SUCCESS: All emails are in the same thread!");
    } else {
      console.log("❌ FAILURE: Emails are in different threads:", threadIds);
    }

    // Test 5: Get thread information
    console.log("\n📧 Test 5: Getting thread information");
    const threadInfo = await EmailProcessor.getThreadInfo(threadIds[0]);
    if (threadInfo) {
      console.log("📊 Thread info:");
      console.log("- Thread ID:", threadInfo.threadId);
      console.log("- Subject:", threadInfo.subject);
      console.log("- Email count:", threadInfo.emailCount);
      console.log("- Participants:", threadInfo.participants);
      console.log("- Original email:", threadInfo.originalEmail.messageId);
      console.log("- Latest email:", threadInfo.latestEmail.messageId);
    }

    // Test 6: Test with different subject variations
    console.log("\n📧 Test 6: Testing with different subject variations");
    const variationData = {
      messageId: "test-variation-999@example.com",
      subject: "Re: Test Thread: Original Message - Additional Info",
      from: { email: "recipient@example.com", name: "Test Recipient" },
      to: [{ email: "sender@example.com", name: "Test Sender" }],
      textContent: "This is a reply with a slightly different subject",
      headers: [
        { name: "Message-ID", value: "<test-variation-999@example.com>" },
        { name: "Subject", value: "Re: Test Thread: Original Message - Additional Info" },
      ],
    };

    const variationEmail = await EmailProcessor.processInboundEmail({
      mail: {
        messageId: variationData.messageId,
        commonHeaders: {
          subject: variationData.subject,
          from: [variationData.from.email],
          to: variationData.to.map((t) => t.email),
        },
        headers: variationData.headers,
        timestamp: new Date().toISOString(),
      },
    });
    console.log("✅ Variation email created with threadId:", variationEmail.threadId);

    // Final verification
    console.log("\n📧 Final verification:");
    const allThreadEmails = await EmailModel.find({
      subject: { $regex: /^Test Thread/ },
    }).sort({ receivedAt: 1 });

    const finalThreadIds = [...new Set(allThreadEmails.map((email) => email.threadId))];
    console.log("- Total emails:", allThreadEmails.length);
    console.log("- Unique thread IDs:", finalThreadIds);

    if (finalThreadIds.length === 1) {
      console.log("🎉 SUCCESS: All test emails are properly threaded!");
    } else {
      console.log("❌ FAILURE: Threading is not working correctly");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the test
testThreadFunctionality();
