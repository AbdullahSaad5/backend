// Gmail SMTP Configuration
export const gmailSmtpConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Gmail specific settings
  tls: {
    rejectUnauthorized: false,
  },
};

// Email configuration for Gmail
export const gmailEmailConfig = {
  defaultFromEmail: process.env.SMTP_USER || "noreply@yourdomain.com",
  defaultFromName: process.env.DEFAULT_FROM_NAME || process.env.SMTP_FROM || "Build-My-Rig",
  replyToEmail: process.env.REPLY_TO_EMAIL || process.env.SMTP_USER || "noreply@yourdomain.com",
  // Rate limiting for Gmail (less restrictive than SES sandbox)
  maxSendRate: parseInt(process.env.GMAIL_MAX_SEND_RATE || "10"), // emails per second
  maxSendQuota: parseInt(process.env.GMAIL_MAX_SEND_QUOTA || "500"), // emails per day (Gmail's daily limit)
};

// Validate required Gmail SMTP environment variables
export const validateGmailConfig = (): boolean => {
  const requiredVars = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(`Missing Gmail SMTP environment variables: ${missingVars.join(", ")}`);
    return false;
  }

  return true;
};
