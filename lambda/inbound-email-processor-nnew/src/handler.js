"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const email_model_1 = require("./models/email.model.js");
const connectDB = async () => {
  try {
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
};
const parseSNSEmailEvent = (event) => {
  const record = event.Records[0];
  if (!record) {
    throw new Error("No SNS record found in event");
  }
  const sesNotification = JSON.parse(record.Sns.Message);
  return {
    messageId: sesNotification.mail.messageId,
    subject: sesNotification.mail.commonHeaders.subject,
    type: "general",
    direction: "inbound",
    status: "received",
    priority: "normal",
    from: {
      email: sesNotification.mail.commonHeaders.from[0],
      name: sesNotification.mail.headers.find((header) => header.name === "From")?.value,
    },
    to: sesNotification.mail.commonHeaders.to.map((email) => ({
      email,
    })),
    receivedAt: new Date(sesNotification.mail.timestamp),
    rawEmailData: sesNotification.mail.raw ? JSON.stringify(sesNotification.mail.raw) : "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!mongoose_1.default.connection.readyState) {
    await connectDB();
  }
  try {
    const email = parseSNSEmailEvent(event);
    console.log("Saving email:", email);
    const savedEmail = await email_model_1.EmailModel.create(email);
    console.log("✅ Email successfully saved:", savedEmail);
  } catch (error) {
    console.error("❌ Failed to save email:", error);
  }
};
exports.handler = handler;
