export const realTimeSyncConfig = {
  // Gmail configuration
  gmail: {
    // Google Cloud Project ID for Gmail watch notifications
    projectId: process.env.GOOGLE_CLOUD_PROJECT || "",

    // Gmail API credentials
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "",

    // Gmail webhook settings
    webhookEnabled: process.env.GMAIL_WEBHOOK_ENABLED === "true",
    pubsubTopic: process.env.GMAIL_PUBSUB_TOPIC || "gmail-sync-notifications",
    serviceAccountKeyPath: process.env.GMAIL_SERVICE_ACCOUNT_KEY_PATH || "",

    // Gmail watch settings
    watchExpiration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    renewalThreshold: 24 * 60 * 60 * 1000, // Renew 24 hours before expiration

    // Polling fallback settings
    pollingInterval: 5 * 60 * 1000, // 5 minutes
    maxPollingEmails: 50, // Maximum emails to fetch per polling cycle
  },

  // Outlook configuration
  outlook: {
    // Webhook endpoint URL for Outlook notifications
    webhookUrl: process.env.OUTLOOK_WEBHOOK_URL || "",

    // Microsoft Graph API settings
    subscriptionExpiration: 3 * 24 * 60 * 60 * 1000, // 3 days in milliseconds
    renewalThreshold: 12 * 60 * 60 * 1000, // Renew 12 hours before expiration

    // Polling fallback settings
    pollingInterval: 5 * 60 * 1000, // 5 minutes
    maxPollingEmails: 50, // Maximum emails to fetch per polling cycle
  },

  // General sync settings
  general: {
    // Cron job intervals
    setupInterval: "*/10 * * * *", // Every 10 minutes
    renewalInterval: "0 */6 * * *", // Every 6 hours
    cleanupInterval: "0 * * * *", // Every hour

    // Rate limiting
    delayBetweenAccounts: 1000, // 1 second delay between account operations

    // Error handling
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds

    // Logging
    enableDetailedLogging: process.env.NODE_ENV === "development",
  },

  // Database settings
  database: {
    // Email storage
    storeFullContent: true, // Store full email content in database
    maxEmailSize: 10 * 1024 * 1024, // 10MB max email size

    // Cleanup settings
    cleanupOldEmails: true,
    emailRetentionDays: 365, // Keep emails for 1 year
  },

  // WebSocket settings
  websocket: {
    // Real-time notifications
    enableNotifications: true,
    notificationTimeout: 5000, // 5 seconds timeout for notifications

    // Client management
    maxClientsPerUser: 5, // Maximum WebSocket connections per user
    heartbeatInterval: 30000, // 30 seconds heartbeat
  },
};

// Validation function to check if required environment variables are set
export const validateRealTimeSyncConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check Gmail configuration
  if (!realTimeSyncConfig.gmail.projectId) {
    errors.push("GOOGLE_CLOUD_PROJECT environment variable is required for Gmail real-time sync");
  }

  if (!realTimeSyncConfig.gmail.clientId) {
    errors.push("GOOGLE_CLIENT_ID environment variable is required for Gmail OAuth");
  }

  if (!realTimeSyncConfig.gmail.clientSecret) {
    errors.push("GOOGLE_CLIENT_SECRET environment variable is required for Gmail OAuth");
  }

  // Check Outlook configuration
  if (!realTimeSyncConfig.outlook.webhookUrl) {
    console.warn("⚠️ OUTLOOK_WEBHOOK_URL not set - Outlook will use polling fallback");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Get configuration for specific provider
export const getProviderConfig = (provider: "gmail" | "outlook") => {
  return realTimeSyncConfig[provider];
};

// Check if real-time sync is enabled for a provider
export const isRealTimeSyncEnabled = (provider: "gmail" | "outlook"): boolean => {
  if (provider === "gmail") {
    return (
      !!realTimeSyncConfig.gmail.projectId &&
      !!realTimeSyncConfig.gmail.clientId &&
      !!realTimeSyncConfig.gmail.clientSecret
    );
  }

  if (provider === "outlook") {
    return !!realTimeSyncConfig.outlook.webhookUrl;
  }

  return false;
};
