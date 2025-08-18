const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const EmailSchema = new mongoose.Schema({
  messageId: String,
  threadId: String,
  accountId: mongoose.Schema.Types.ObjectId,
  direction: String,
  type: String,
  status: String,
  priority: String,
  subject: String,
  normalizedSubject: String,
  textContent: String,
  htmlContent: String,
  from: {
    email: String,
    name: String,
  },
  to: [
    {
      email: String,
      name: String,
    },
  ],
  cc: [
    {
      email: String,
      name: String,
    },
  ],
  bcc: [
    {
      email: String,
      name: String,
    },
  ],
  replyTo: {
    email: String,
    name: String,
  },
  inReplyTo: String,
  references: [String],
  parentMessageId: String,
  headers: [
    {
      name: String,
      value: String,
    },
  ],
  attachments: [
    {
      fileName: String,
      fileUrl: String,
      fileSize: Number,
      fileType: String,
      contentId: String,
    },
  ],
  amazonOrderId: String,
  amazonBuyerId: String,
  amazonMarketplace: String,
  amazonASIN: String,
  ebayItemId: String,
  ebayTransactionId: String,
  ebayBuyerId: String,
  receivedAt: Date,
  processedAt: Date,
  sentAt: Date,
  readAt: Date,
  repliedAt: Date,
  forwardedAt: Date,
  archivedAt: Date,
  spamMarkedAt: Date,
  isRead: Boolean,
  isReplied: Boolean,
  isForwarded: Boolean,
  isArchived: Boolean,
  isSpam: Boolean,
  isStarred: Boolean,
  tags: [String],
  category: String,
  labels: [String],
  folder: String,
  assignedTo: mongoose.Schema.Types.ObjectId,
  assignedAt: Date,
  relatedOrderId: mongoose.Schema.Types.ObjectId,
  relatedCustomerId: mongoose.Schema.Types.ObjectId,
  relatedTicketId: mongoose.Schema.Types.ObjectId,
  rawEmailData: mongoose.Schema.Types.Mixed,
});

const EmailModel = mongoose.model("Email", EmailSchema);

async function cleanupDuplicateEmails() {
  try {
    console.log("🔍 Starting duplicate email cleanup...");

    // Find all emails
    const allEmails = await EmailModel.find({}).lean();
    console.log(`📧 Found ${allEmails.length} total emails`);

    const duplicates = new Map();
    const toDelete = [];

    // Group emails by messageId
    allEmails.forEach((email) => {
      const key = email.messageId || `${email.from?.email}-${email.subject}-${email.receivedAt}`;
      if (!duplicates.has(key)) {
        duplicates.set(key, []);
      }
      duplicates.get(key).push(email);
    });

    // Find duplicates
    duplicates.forEach((emails, key) => {
      if (emails.length > 1) {
        console.log(`🔄 Found ${emails.length} duplicates for key: ${key}`);

        // Sort by creation date (keep the oldest one)
        emails.sort((a, b) => new Date(a._id.getTimestamp()) - new Date(b._id.getTimestamp()));

        // Mark all but the first one for deletion
        for (let i = 1; i < emails.length; i++) {
          toDelete.push(emails[i]._id);
        }
      }
    });

    console.log(`🗑️ Found ${toDelete.length} duplicate emails to delete`);

    if (toDelete.length > 0) {
      // Delete duplicates
      const result = await EmailModel.deleteMany({ _id: { $in: toDelete } });
      console.log(`✅ Deleted ${result.deletedCount} duplicate emails`);
    } else {
      console.log("✅ No duplicate emails found");
    }

    // Also clean up emails with same content but different messageIds (within 5 minutes)
    console.log("🔍 Checking for content-based duplicates...");

    const contentDuplicates = await EmailModel.aggregate([
      {
        $group: {
          _id: {
            fromEmail: "$from.email",
            subject: "$subject",
            accountId: "$accountId",
          },
          emails: { $push: "$$ROOT" },
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    let contentDuplicatesDeleted = 0;

    for (const group of contentDuplicates) {
      const emails = group.emails;

      // Sort by receivedAt (keep the oldest one)
      emails.sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));

      // Check if emails are within 5 minutes of each other
      const firstEmail = emails[0];
      const recentDuplicates = emails.filter(
        (email) => Math.abs(new Date(email.receivedAt) - new Date(firstEmail.receivedAt)) < 5 * 60 * 1000
      );

      if (recentDuplicates.length > 1) {
        console.log(`🔄 Found ${recentDuplicates.length} content duplicates for subject: ${firstEmail.subject}`);

        // Delete all but the first one
        const duplicateIds = recentDuplicates.slice(1).map((e) => e._id);
        const deleteResult = await EmailModel.deleteMany({ _id: { $in: duplicateIds } });
        contentDuplicatesDeleted += deleteResult.deletedCount;
      }
    }

    console.log(`✅ Deleted ${contentDuplicatesDeleted} content-based duplicate emails`);

    // Final count
    const finalCount = await EmailModel.countDocuments();
    console.log(`📧 Final email count: ${finalCount}`);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the cleanup
cleanupDuplicateEmails();
