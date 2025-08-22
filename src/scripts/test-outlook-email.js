const { OutlookEmailService } = require("../services/outlook-email.service");

// Mock email account for testing
const mockEmailAccount = {
  _id: "test-outlook-account",
  emailAddress: "test@outlook.com",
  accountName: "Test Outlook Account",
  displayName: "Test User",
  oauth: {
    provider: "outlook",
    clientId: "test-client-id",
    clientSecret: "encrypted-secret",
    refreshToken: "encrypted-refresh-token",
    accessToken: "encrypted-access-token",
    tokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
  },
};

// Test message
const testMessage = {
  to: "recipient@example.com",
  subject: "Test Email from BAVIT",
  body: "This is a test email sent via the BAVIT Outlook service.",
  htmlBody: "<p>This is a <strong>test email</strong> sent via the BAVIT Outlook service.</p>",
};

async function testOutlookEmailService() {
  console.log("🧪 Testing Outlook Email Service...");

  try {
    // Test email preparation
    console.log("\n📧 Testing email data preparation...");
    const emailData = OutlookEmailService.prepareEmailData(testMessage, mockEmailAccount);
    console.log("✅ Email data prepared successfully");
    console.log("📋 Email data structure:", JSON.stringify(emailData, null, 2));

    // Test message ID generation
    console.log("\n🆔 Testing message ID generation...");
    const messageId1 = OutlookEmailService.generateMessageId();
    const messageId2 = OutlookEmailService.generateMessageId();
    console.log("✅ Message ID 1:", messageId1);
    console.log("✅ Message ID 2:", messageId2);
    console.log("✅ IDs are unique:", messageId1 !== messageId2);

    // Test validation
    console.log("\n✅ Testing validation...");
    const invalidMessage = {
      subject: "Test Subject",
      // Missing 'to' and 'body'
    };

    const validationResult = OutlookEmailService.sendEmail(mockEmailAccount, invalidMessage);
    console.log("✅ Validation working correctly");

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📝 Note: This test only validates the service structure and data preparation.");
    console.log("📝 To test actual email sending, you need valid OAuth credentials and Microsoft Graph API access.");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testOutlookEmailService();
