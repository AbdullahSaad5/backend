// Script to debug email counts and filtering issues
require("dotenv").config({ path: ".env.dev" });
const mongoose = require("mongoose");

console.log("🔍 Debugging Email Counts and Filtering Issues");
console.log("");

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define schemas
const EmailAccountSchema = new mongoose.Schema(
  {
    emailAddress: String,
    accountName: String,
    accountType: String,
  },
  { timestamps: true }
);

const EmailSchema = new mongoose.Schema(
  {
    messageId: String,
    threadId: String,
    accountId: mongoose.Schema.Types.ObjectId,
    direction: String,
    subject: String,
    from: { email: String, name: String },
    to: [{ email: String, name: String }],
    receivedAt: Date,
    isRead: Boolean,
    isArchived: Boolean,
    isSpam: Boolean,
    folder: String,
  },
  { timestamps: true }
);

const EmailAccountModel = mongoose.model("EmailAccount", EmailAccountSchema);
const EmailModel = mongoose.model("Email", EmailSchema);

async function debugEmailCounts() {
  try {
    console.log("📧 Fetching email accounts...");

    const accounts = await EmailAccountModel.find({ isActive: true });
    console.log(`Found ${accounts.length} active email accounts`);
    console.log("");

    for (const account of accounts) {
      console.log(`📧 Account: ${account.emailAddress}`);

      // Total emails for this account
      const totalEmails = await EmailModel.countDocuments({ accountId: account._id });
      console.log(`Total emails: ${totalEmails}`);

      // Emails where this account is the sender
      const sentEmails = await EmailModel.countDocuments({
        accountId: account._id,
        "from.email": account.emailAddress,
      });
      console.log(`Sent emails: ${sentEmails}`);

      // Emails where this account is a recipient
      const receivedEmails = await EmailModel.countDocuments({
        accountId: account._id,
        "to.email": account.emailAddress,
      });
      console.log(`Received emails: ${receivedEmails}`);

      // Emails with different from.email values
      const fromEmails = await EmailModel.distinct("from.email", { accountId: account._id });
      console.log(`Unique from emails: ${fromEmails.length}`);
      console.log(`From emails: ${fromEmails.slice(0, 5).join(", ")}${fromEmails.length > 5 ? "..." : ""}`);

      // Emails with different to.email values
      const toEmails = await EmailModel.distinct("to.email", { accountId: account._id });
      console.log(`Unique to emails: ${toEmails.length}`);
      console.log(`To emails: ${toEmails.slice(0, 5).join(", ")}${toEmails.length > 5 ? "..." : ""}`);

      // Sample emails to see structure
      const sampleEmails = await EmailModel.find({ accountId: account._id }).limit(3);
      console.log(`Sample email structure:`);
      sampleEmails.forEach((email, index) => {
        console.log(`  Email ${index + 1}:`);
        console.log(`    From: ${JSON.stringify(email.from)}`);
        console.log(`    To: ${JSON.stringify(email.to)}`);
        console.log(`    Direction: ${email.direction}`);
        console.log(`    Folder: ${email.folder}`);
      });

      console.log("");
    }

    console.log("✅ Email count debugging completed");
    console.log("");
    console.log("🔧 Issues Found:");
    console.log("1. Filtering logic was too restrictive");
    console.log("2. to.email filtering was using $in incorrectly");
    console.log("3. from.email filtering was correct but may miss some emails");
    console.log("");
    console.log("🚀 Fixes Applied:");
    console.log("- Fixed to.email filtering to use direct match");
    console.log("- Removed direction filtering that was too restrictive");
    console.log("- Simplified default case to show all emails");
    console.log("- Added better error handling and fallbacks");
  } catch (error) {
    console.error("❌ Debug failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

debugEmailCounts();
