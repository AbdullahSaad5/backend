// Test script for email categorization logic
const determineEmailCategory = (fromEmail, subject, textContent, htmlContent) => {
  const content = (textContent + " " + htmlContent).toLowerCase();
  const fromLower = fromEmail.toLowerCase();
  const subjectLower = subject.toLowerCase();

  // First, check for specific sender domains to avoid false positives
  const senderDomain = fromLower.split("@")[1] || "";

  // Map to frontend tab categories with improved logic
  // Primary tab - Business critical emails
  if (
    fromLower.includes("amazon") ||
    senderDomain.includes("amazon") ||
    fromLower.includes("ebay") ||
    senderDomain.includes("ebay") ||
    fromLower.includes("support") ||
    senderDomain.includes("support") ||
    subjectLower.includes("order") ||
    subjectLower.includes("invoice") ||
    subjectLower.includes("confirmation") ||
    subjectLower.includes("receipt") ||
    subjectLower.includes("shipping") ||
    subjectLower.includes("delivery") ||
    subjectLower.includes("payment") ||
    subjectLower.includes("refund") ||
    subjectLower.includes("return") ||
    content.includes("order confirmation") ||
    content.includes("invoice") ||
    content.includes("payment confirmation")
  ) {
    return "primary";
  }

  // Promotions tab - Marketing and promotional emails
  if (
    subjectLower.includes("newsletter") ||
    subjectLower.includes("marketing") ||
    subjectLower.includes("promotion") ||
    subjectLower.includes("offer") ||
    subjectLower.includes("sale") ||
    subjectLower.includes("discount") ||
    subjectLower.includes("deal") ||
    subjectLower.includes("coupon") ||
    subjectLower.includes("special") ||
    subjectLower.includes("limited time") ||
    content.includes("unsubscribe") ||
    content.includes("click here to") ||
    content.includes("limited time offer") ||
    content.includes("act now") ||
    content.includes("don't miss out") ||
    senderDomain.includes("newsletter") ||
    senderDomain.includes("marketing") ||
    senderDomain.includes("promo")
  ) {
    return "promotions";
  }

  // Social tab - Social media notifications
  if (
    fromLower.includes("facebook") ||
    fromLower.includes("twitter") ||
    fromLower.includes("instagram") ||
    fromLower.includes("linkedin") ||
    fromLower.includes("youtube") ||
    fromLower.includes("tiktok") ||
    fromLower.includes("snapchat") ||
    fromLower.includes("pinterest") ||
    senderDomain.includes("facebook") ||
    senderDomain.includes("twitter") ||
    senderDomain.includes("instagram") ||
    senderDomain.includes("linkedin") ||
    senderDomain.includes("youtube") ||
    senderDomain.includes("tiktok") ||
    subjectLower.includes("friend request") ||
    subjectLower.includes("new follower") ||
    subjectLower.includes("like") ||
    subjectLower.includes("comment") ||
    subjectLower.includes("mention")
  ) {
    return "social";
  }

  // Updates tab - System notifications and updates
  if (
    subjectLower.includes("notification") ||
    subjectLower.includes("alert") ||
    subjectLower.includes("system") ||
    subjectLower.includes("update") ||
    subjectLower.includes("maintenance") ||
    subjectLower.includes("security") ||
    subjectLower.includes("password") ||
    subjectLower.includes("verification") ||
    subjectLower.includes("confirm") ||
    subjectLower.includes("activate") ||
    fromLower.includes("noreply") ||
    fromLower.includes("no-reply") ||
    fromLower.includes("system") ||
    fromLower.includes("admin") ||
    fromLower.includes("security") ||
    fromLower.includes("verify") ||
    senderDomain.includes("noreply") ||
    senderDomain.includes("system") ||
    senderDomain.includes("security") ||
    content.includes("security alert") ||
    content.includes("system maintenance") ||
    content.includes("password reset") ||
    content.includes("account verification")
  ) {
    return "updates";
  }

  // Default to primary for business emails
  return "primary";
};

// Test cases
const testCases = [
  {
    name: "Amazon Order Email",
    from: "orders@amazon.com",
    subject: "Your Amazon order #123-4567890-1234567",
    expected: "primary",
  },
  {
    name: "eBay Message",
    from: "ebay@ebay.com",
    subject: "New message about your item",
    expected: "primary",
  },
  {
    name: "Newsletter Email",
    from: "newsletter@company.com",
    subject: "Weekly Newsletter - Special Offers Inside!",
    expected: "promotions",
  },
  {
    name: "Facebook Notification",
    from: "notification@facebook.com",
    subject: "You have a new friend request",
    expected: "social",
  },
  {
    name: "System Update",
    from: "noreply@system.com",
    subject: "System maintenance scheduled",
    expected: "updates",
  },
  {
    name: "Regular Business Email",
    from: "john@company.com",
    subject: "Meeting tomorrow",
    expected: "primary",
  },
  {
    name: "Marketing Email",
    from: "marketing@store.com",
    subject: "50% off sale - limited time!",
    expected: "promotions",
  },
  {
    name: "LinkedIn Notification",
    from: "linkedin@linkedin.com",
    subject: "Someone viewed your profile",
    expected: "social",
  },
  {
    name: "Password Reset",
    from: "security@service.com",
    subject: "Password reset requested",
    expected: "updates",
  },
];

console.log("🧪 Testing Email Categorization Logic\n");

testCases.forEach((testCase, index) => {
  const result = determineEmailCategory(testCase.from, testCase.subject, "", "");
  const status = result === testCase.expected ? "✅ PASS" : "❌ FAIL";

  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   From: ${testCase.from}`);
  console.log(`   Subject: ${testCase.subject}`);
  console.log(`   Expected: ${testCase.expected}, Got: ${result} ${status}\n`);
});

console.log("🎯 Categorization Test Complete!");
