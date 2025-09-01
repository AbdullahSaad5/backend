import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { RealTimeEmailSyncService } from "@/services/real-time-email-sync.service";
import { EmailAccountModel } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";
import crypto from "crypto";

export const GmailWebhookController = {
  /**
   * Handle Gmail push notifications from Google Cloud Pub/Sub
   * This endpoint receives real-time notifications when emails change in Gmail
   */
  handleGmailNotification: async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();

    try {
      console.log(`🚀 [${requestId}] ===== GMAIL WEBHOOK NOTIFICATION RECEIVED =====`);
      console.log(`🚀 [${requestId}] Headers:`, Object.keys(req.headers));
      console.log(`🚀 [${requestId}] Body keys:`, Object.keys(req.body));
      console.log(`🚀 [${requestId}] Method:`, req.method);
      console.log(`🚀 [${requestId}] URL:`, req.url);
      console.log(`🚀 [${requestId}] Raw body:`, JSON.stringify(req.body, null, 2));

      logger.info(`[${requestId}] Gmail webhook notification received`, {
        headers: Object.keys(req.headers),
        bodyKeys: Object.keys(req.body),
        method: req.method,
        url: req.url,
      });

      // Gmail sends notifications via Google Cloud Pub/Sub
      // The body contains a base64-encoded message with the actual notification
      const { message, subscription } = req.body;

      if (!message) {
        console.log(`❌ [${requestId}] No message in Gmail webhook payload`);
        logger.warn(`[${requestId}] No message in Gmail webhook payload`);
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "No message in webhook payload",
          requestId,
        });
      }

      console.log(`📨 [${requestId}] Message object received:`, JSON.stringify(message, null, 2));
      console.log(`📨 [${requestId}] Subscription:`, subscription);

      // Decode the base64 message
      let decodedMessage;
      try {
        console.log(`🔓 [${requestId}] Attempting to decode base64 message...`);
        console.log(`🔓 [${requestId}] Message data to decode:`, message.data);

        decodedMessage = JSON.parse(Buffer.from(message.data, "base64").toString());

        console.log(`✅ [${requestId}] Successfully decoded message:`, JSON.stringify(decodedMessage, null, 2));
      } catch (decodeError) {
        console.log(`❌ [${requestId}] Failed to decode Gmail webhook message:`, decodeError);
        logger.error(`[${requestId}] Failed to decode Gmail webhook message:`, decodeError);
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Failed to decode webhook message",
          requestId,
        });
      }

      console.log(`📧 [${requestId}] Decoded Gmail notification details:`, {
        emailAddress: decodedMessage.emailAddress,
        historyId: decodedMessage.historyId,
        type: decodedMessage.type,
      });

      logger.info(`[${requestId}] Decoded Gmail notification:`, {
        emailAddress: decodedMessage.emailAddress,
        historyId: decodedMessage.historyId,
        type: decodedMessage.type,
      });

      // Process the Gmail notification with subscription info
      console.log(`🔄 [${requestId}] Starting to process Gmail notification...`);
      const result = await processGmailNotification(decodedMessage, subscription, requestId);

      if (result.success) {
        console.log(`✅ [${requestId}] Gmail notification processed successfully:`, result.data);
        res.status(StatusCodes.OK).json({
          success: true,
          message: "Gmail notification processed successfully",
          data: result.data,
          requestId,
        });
      } else {
        console.log(`❌ [${requestId}] Failed to process Gmail notification:`, result.error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Failed to process Gmail notification",
          error: result.error,
          requestId,
        });
      }
    } catch (error: any) {
      console.log(`💥 [${requestId}] Error processing Gmail webhook:`, error);
      logger.error(`[${requestId}] Error processing Gmail webhook:`, error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error processing Gmail webhook",
        error: error.message,
        requestId,
      });
    }
  },

  /**
   * Health check endpoint for the webhook
   */
  healthCheck: async (req: Request, res: Response) => {
    console.log(`🏥 [Gmail Webhook] Health check requested`);
    console.log(`🏥 [Gmail Webhook] Headers:`, Object.keys(req.headers));
    console.log(`🏥 [Gmail Webhook] Method:`, req.method);
    console.log(`🏥 [Gmail Webhook] URL:`, req.url);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Gmail webhook is healthy",
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Test endpoint for manual notification processing (protected)
   */
  testNotification: async (req: Request, res: Response) => {
    try {
      console.log(`🧪 [Gmail Webhook] Test notification requested`);
      console.log(`🧪 [Gmail Webhook] Test payload:`, req.body);

      const { emailAddress, historyId } = req.body;

      if (!emailAddress || !historyId) {
        console.log(`❌ [Gmail Webhook] Test notification missing required fields`);
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "emailAddress and historyId are required",
        });
      }

      console.log(`🧪 [Gmail Webhook] Processing test notification for: ${emailAddress}, historyId: ${historyId}`);
      const result = await processGmailNotification(
        { emailAddress, historyId },
        "test-subscription",
        crypto.randomUUID()
      );

      if (result.success) {
        console.log(`✅ [Gmail Webhook] Test notification processed successfully:`, result.data);
        res.status(StatusCodes.OK).json({
          success: true,
          message: "Test notification processed successfully",
          data: result.data,
        });
      } else {
        console.log(`❌ [Gmail Webhook] Test notification failed:`, result.error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Failed to process test notification",
          error: result.error,
        });
      }
    } catch (error: any) {
      console.log(`💥 [Gmail Webhook] Test notification error:`, error);
      logger.error("Error processing test notification:", error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to process test notification",
        error: error.message,
      });
    }
  },

  /**
   * Test endpoint for manual Gmail sync (protected)
   */
  testGmailSync: async (req: Request, res: Response) => {
    try {
      console.log(`🧪 [Gmail Webhook] Test Gmail sync requested`);
      console.log(`🧪 [Gmail Webhook] Test payload:`, req.body);

      const { emailAddress, historyId } = req.body;

      if (!emailAddress) {
        console.log(`❌ [Gmail Webhook] Test sync missing emailAddress`);
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "emailAddress is required",
        });
      }

      console.log(
        `🧪 [Gmail Webhook] Processing test sync for: ${emailAddress}, historyId: ${historyId || "undefined"}`
      );

      // Find the account
      const account = await EmailAccountModel.findOne({
        emailAddress: emailAddress,
        accountType: "gmail",
        isActive: true,
      });

      if (!account) {
        console.log(`❌ [Gmail Webhook] Account not found: ${emailAddress}`);
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Gmail account not found",
        });
      }

      console.log(`✅ [Gmail Webhook] Found account: ${account.emailAddress}`);

      // Trigger sync
      const syncResult = await RealTimeEmailSyncService.syncGmailEmails(account, historyId);

      if (syncResult.success) {
        console.log(`✅ [Gmail Webhook] Test sync completed successfully:`, {
          emailsProcessed: syncResult.emailsProcessed,
          message: syncResult.message,
        });
        res.status(StatusCodes.OK).json({
          success: true,
          message: "Test Gmail sync completed successfully",
          data: {
            emailsProcessed: syncResult.emailsProcessed,
            message: syncResult.message,
          },
        });
      } else {
        console.log(`❌ [Gmail Webhook] Test sync failed:`, syncResult.error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Failed to complete test Gmail sync",
          error: syncResult.error,
        });
      }
    } catch (error: any) {
      console.log(`💥 [Gmail Webhook] Test sync error:`, error);
      logger.error("Error processing test Gmail sync:", error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to process test Gmail sync",
        error: error.message,
      });
    }
  },

  /**
   * Get webhook status and configuration
   */
  getWebhookStatus: async (req: Request, res: Response) => {
    try {
      const status = {
        webhookEnabled: process.env.GMAIL_WEBHOOK_ENABLED === "true",
        googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || "Not set",
        pubsubTopic: process.env.GMAIL_PUBSUB_TOPIC || "gmail-sync-notifications",
        webhookEndpoint: `${req.protocol}://${req.get("host")}/api/gmail-webhook/webhook`,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      };

      res.status(StatusCodes.OK).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error("Error getting webhook status:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get webhook status",
        error: error.message,
      });
    }
  },

  /**
   * Validate webhook setup and configuration
   */
  validateWebhookSetup: async (req: Request, res: Response) => {
    try {
      const validation = {
        googleCloudProject: {
          set: !!process.env.GOOGLE_CLOUD_PROJECT,
          value: process.env.GOOGLE_CLOUD_PROJECT || "Not set",
        },
        gmailClientId: {
          set: !!process.env.GOOGLE_CLIENT_ID,
          value: process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set",
        },
        gmailClientSecret: {
          set: !!process.env.GOOGLE_CLIENT_SECRET,
          value: process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Not set",
        },
        webhookEnabled: {
          set: process.env.GMAIL_WEBHOOK_ENABLED === "true",
          value: process.env.GMAIL_WEBHOOK_ENABLED || "false",
        },
        pubsubTopic: {
          set: !!process.env.GMAIL_PUBSUB_TOPIC,
          value: process.env.GMAIL_PUBSUB_TOPIC || "gmail-sync-notifications",
        },
        serviceAccountKey: {
          set: !!process.env.GMAIL_SERVICE_ACCOUNT_KEY_PATH,
          value: process.env.GMAIL_SERVICE_ACCOUNT_KEY_PATH || "Not set",
        },
        webhookEndpoint: {
          accessible: true, // Basic check
          url: `${req.protocol}://${req.get("host")}/api/gmail-webhook/webhook`,
        },
      };

      const isValid =
        validation.googleCloudProject.set && validation.gmailClientId.set && validation.gmailClientSecret.set;

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          isValid,
          validation,
          recommendations: isValid
            ? []
            : [
                "Set GOOGLE_CLOUD_PROJECT environment variable",
                "Configure Gmail OAuth credentials",
                "Enable Gmail webhook if needed",
              ],
        },
      });
    } catch (error: any) {
      logger.error("Error validating webhook setup:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to validate webhook setup",
        error: error.message,
      });
    }
  },

  /**
   * Debug subscription hash mismatches
   */
  debugSubscriptionHashes: async (req: Request, res: Response) => {
    try {
      console.log(`🔍 [Debug] Getting all Gmail accounts and their subscription hashes`);

      const activeGmailAccounts = await EmailAccountModel.find({
        accountType: "gmail",
        isActive: true,
      });

      const accountDetails = activeGmailAccounts.map((account) => {
        const accountHash = crypto
          .createHash("md5")
          .update(`${account.emailAddress}-${account._id}`)
          .digest("hex")
          .substring(0, 8);

        const expectedSubscription = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/subscriptions/gmail-sync-${accountHash}-webhook`;

        return {
          accountId: account._id,
          emailAddress: account.emailAddress,
          accountHash: accountHash,
          expectedSubscription: expectedSubscription,
          storedSubscription: account.syncState?.gmailSubscription || "Not set",
          isWatching: account.syncState?.isWatching || false,
          lastSyncAt: account.syncState?.lastSyncAt || "Never",
        };
      });

      console.log(`🔍 [Debug] Found ${accountDetails.length} Gmail accounts`);
      accountDetails.forEach((account) => {
        console.log(
          `🔍 [Debug] ${account.emailAddress}: hash=${account.accountHash}, subscription=${account.expectedSubscription}`
        );
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          totalAccounts: accountDetails.length,
          accounts: accountDetails,
          note: "Use this to identify subscription hash mismatches and fix orphaned subscriptions",
        },
      });
    } catch (error: any) {
      logger.error("Error debugging subscription hashes:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to debug subscription hashes",
        error: error.message,
      });
    }
  },

  /**
   * Clean up orphaned Gmail subscriptions
   */
  cleanupOrphanedSubscriptions: async (req: Request, res: Response) => {
    try {
      console.log(`🧹 [Cleanup] Starting orphaned subscription cleanup`);

      const { RealTimeEmailSyncService } = await import("@/services/real-time-email-sync.service");
      const pubsub = (RealTimeEmailSyncService as any).getPubSubClient();

      // Get all existing subscriptions
      const [allSubscriptions] = await pubsub.getSubscriptions();
      const gmailSubscriptions = allSubscriptions.filter(
        (sub: any) => sub.name.includes("gmail-sync-") && sub.name.includes("-webhook")
      );

      console.log(`🔍 [Cleanup] Found ${gmailSubscriptions.length} Gmail subscriptions in Google Cloud`);

      // Get all active Gmail accounts
      const activeGmailAccounts = await EmailAccountModel.find({
        accountType: "gmail",
        isActive: true,
      });

      // Build set of expected subscription names
      const expectedSubscriptions = new Set();
      activeGmailAccounts.forEach((account) => {
        const accountHash = crypto
          .createHash("md5")
          .update(`${account.emailAddress}-${account._id}`)
          .digest("hex")
          .substring(0, 8);
        expectedSubscriptions.add(`gmail-sync-${accountHash}-webhook`);

        // Also add stored subscription if different
        if (account.syncState?.gmailSubscription) {
          const storedName = account.syncState.gmailSubscription.split("/").pop();
          if (storedName) {
            expectedSubscriptions.add(storedName);
          }
        }
      });

      console.log(`🔍 [Cleanup] Expected subscriptions:`, Array.from(expectedSubscriptions));

      // Find orphaned subscriptions
      const orphanedSubscriptions = [];
      const activeSubscriptions = [];

      for (const subscription of gmailSubscriptions) {
        const subscriptionName = subscription.name.split("/").pop();
        if (expectedSubscriptions.has(subscriptionName)) {
          activeSubscriptions.push(subscriptionName);
        } else {
          orphanedSubscriptions.push(subscriptionName);
        }
      }

      console.log(`🔍 [Cleanup] Found ${orphanedSubscriptions.length} orphaned subscriptions`);
      console.log(`🔍 [Cleanup] Orphaned subscriptions:`, orphanedSubscriptions);

      // Clean up orphaned subscriptions (dry run by default)
      const dryRun = req.query.dryRun !== "false";
      const cleanupResults = [];

      if (dryRun) {
        console.log(`🔍 [Cleanup] DRY RUN MODE - No actual deletions performed`);
        orphanedSubscriptions.forEach((subName) => {
          cleanupResults.push({
            subscriptionName: subName,
            action: "would_delete",
            status: "dry_run",
          });
        });
      } else {
        console.log(`🧹 [Cleanup] LIVE MODE - Deleting orphaned subscriptions`);
        for (const subName of orphanedSubscriptions) {
          try {
            await pubsub.subscription(subName).delete();
            console.log(`✅ [Cleanup] Deleted orphaned subscription: ${subName}`);
            cleanupResults.push({
              subscriptionName: subName,
              action: "deleted",
              status: "success",
            });
          } catch (error: any) {
            console.log(`❌ [Cleanup] Failed to delete subscription ${subName}:`, error.message);
            cleanupResults.push({
              subscriptionName: subName,
              action: "delete_failed",
              status: "error",
              error: error.message,
            });
          }
        }
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          dryRun,
          totalSubscriptionsFound: gmailSubscriptions.length,
          activeSubscriptions: activeSubscriptions.length,
          orphanedSubscriptions: orphanedSubscriptions.length,
          cleanupResults,
          note: dryRun
            ? "This was a dry run. Add ?dryRun=false to actually delete orphaned subscriptions"
            : "Live cleanup completed",
        },
      });
    } catch (error: any) {
      logger.error("Error cleaning up orphaned subscriptions:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to cleanup orphaned subscriptions",
        error: error.message,
      });
    }
  },
};

/**
 * Process Gmail notification and trigger email sync
 */
async function processGmailNotification(
  notification: { emailAddress: string; historyId: string; type?: string },
  subscription: string,
  requestId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { emailAddress, historyId, type } = notification;

    console.log(`🔄 [${requestId}] ===== PROCESSING GMAIL NOTIFICATION =====`);
    console.log(`🔄 [${requestId}] Email Address: ${emailAddress}`);
    console.log(`🔄 [${requestId}] History ID: ${historyId}`);
    console.log(`🔄 [${requestId}] Type: ${type || "undefined"}`);
    console.log(`🔄 [${requestId}] Subscription: ${subscription}`);

    logger.info(`[${requestId}] Processing Gmail notification for: ${emailAddress}, historyId: ${historyId}`);

    // IMPORTANT: In Gmail push notifications, the emailAddress is the SENDER, not the receiver
    // We need to find the account that should process this notification based on the subscription
    // The subscription name contains the account hash, so we can identify the specific account

    console.log(`🔍 [${requestId}] Gmail push notification received - emailAddress is the SENDER, not the receiver`);
    console.log(`🔍 [${requestId}] We need to find the RECEIVER account that should process this notification`);
    console.log(`🔍 [${requestId}] Using subscription to identify the correct account: ${subscription}`);

    // Extract account hash from subscription name
    // Subscription format: projects/build-my-rig-468317/subscriptions/gmail-sync-{accountHash}-webhook
    const subscriptionMatch = subscription.match(/gmail-sync-([a-f0-9]+)-webhook/);

    if (!subscriptionMatch) {
      console.log(`❌ [${requestId}] Could not extract account hash from subscription: ${subscription}`);
      return {
        success: false,
        error: "Invalid subscription format - cannot identify account",
      };
    }

    const accountHash = subscriptionMatch[1];
    console.log(`🔍 [${requestId}] Extracted account hash: ${accountHash}`);

    // Find the account that matches this subscription hash
    console.log(`🔍 [${requestId}] Searching for Gmail account with hash: ${accountHash}`);
    const activeGmailAccounts = await EmailAccountModel.find({
      accountType: "gmail",
      isActive: true,
      "syncState.isWatching": true,
    });

    console.log(`🔍 [${requestId}] Found ${activeGmailAccounts.length} active Gmail accounts`);

    if (activeGmailAccounts.length === 0) {
      console.log(`❌ [${requestId}] No active Gmail accounts found`);
      return {
        success: false,
        error: "No active Gmail accounts found",
      };
    }

    // Find the account that matches the subscription hash
    let targetAccount = null;
    const accountHashMap = new Map();

    for (const account of activeGmailAccounts) {
      const accountHashFromDb = crypto
        .createHash("md5")
        .update(`${account.emailAddress}-${account._id}`)
        .digest("hex")
        .substring(0, 8);

      accountHashMap.set(accountHashFromDb, account);
      console.log(`🔍 [${requestId}] Checking account ${account.emailAddress} with hash: ${accountHashFromDb}`);

      if (accountHashFromDb === accountHash) {
        targetAccount = account;
        console.log(`✅ [${requestId}] Found matching account: ${account.emailAddress}`);
        break;
      }
    }

    // If no exact match found, try fallback strategies
    if (!targetAccount) {
      console.log(`⚠️ [${requestId}] No exact hash match found for: ${accountHash}`);
      console.log(`⚠️ [${requestId}] Available account hashes:`, Array.from(accountHashMap.keys()));
      console.log(
        `⚠️ [${requestId}] Available accounts:`,
        activeGmailAccounts.map((a) => a.emailAddress)
      );

      // FALLBACK STRATEGY 1: Check if we have a stored subscription hash in the account
      for (const account of activeGmailAccounts) {
        if (account.syncState?.gmailSubscription && account.syncState.gmailSubscription.includes(accountHash)) {
          targetAccount = account;
          console.log(`✅ [${requestId}] Found account via stored subscription: ${account.emailAddress}`);
          break;
        }
      }

      // FALLBACK STRATEGY 2: If only one active Gmail account, use it (common scenario)
      if (!targetAccount && activeGmailAccounts.length === 1) {
        targetAccount = activeGmailAccounts[0];
        console.log(`✅ [${requestId}] Using single active Gmail account: ${targetAccount.emailAddress}`);

        // Update the account with correct subscription info
        try {
          const correctSubscription = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/subscriptions/gmail-sync-${accountHash}-webhook`;
          await EmailAccountModel.findByIdAndUpdate(targetAccount._id, {
            $set: {
              "syncState.gmailSubscription": correctSubscription,
              "syncState.lastWatchRenewal": new Date(),
            },
          });
          console.log(`🔄 [${requestId}] Updated account with correct subscription: ${correctSubscription}`);
        } catch (updateError) {
          console.log(`⚠️ [${requestId}] Failed to update subscription info:`, updateError);
        }
      }

      // FALLBACK STRATEGY 3: If still no match, log detailed debug info and fail gracefully
      if (!targetAccount) {
        console.log(`❌ [${requestId}] SUBSCRIPTION HASH MISMATCH DETECTED:`);
        console.log(`❌ [${requestId}] Webhook subscription hash: ${accountHash}`);
        console.log(`❌ [${requestId}] This indicates an orphaned subscription or account recreation.`);
        console.log(`❌ [${requestId}] Possible solutions:`);
        console.log(`❌ [${requestId}] 1. Delete orphaned subscription: gmail-sync-${accountHash}-webhook`);
        console.log(`❌ [${requestId}] 2. Recreate Gmail watch for existing accounts`);
        console.log(`❌ [${requestId}] 3. Check if account was deleted/recreated`);

        return {
          success: false,
          error: `Subscription hash mismatch. Webhook hash: ${accountHash}, Available accounts: ${activeGmailAccounts.map((a) => `${a.emailAddress}(${crypto.createHash("md5").update(`${a.emailAddress}-${a._id}`).digest("hex").substring(0, 8)})`).join(", ")}`,
        };
      }
    }

    const account = targetAccount;
    console.log(`✅ [${requestId}] Using account to process notification:`, {
      accountId: account._id,
      emailAddress: account.emailAddress,
      isActive: account.isActive,
      hasOAuth: !!account.oauth?.accessToken,
    });

    if (!account.oauth?.accessToken) {
      console.log(`❌ [${requestId}] Gmail account has no OAuth token: ${account.emailAddress}`);
      logger.warn(`[${requestId}] Gmail account has no OAuth token: ${account.emailAddress}`);
      return {
        success: false,
        error: `Gmail account has no OAuth token: ${account.emailAddress}`,
      };
    }

    console.log(`🔄 [${requestId}] Triggering Gmail sync for account: ${account.emailAddress}`);
    console.log(`🔄 [${requestId}] Note: This will sync emails for the receiver account, not the sender`);
    logger.info(`[${requestId}] Triggering Gmail sync for account: ${account.emailAddress}`);

    // Trigger immediate sync for this account using the historyId
    console.log(`🔄 [${requestId}] Calling RealTimeEmailSyncService.syncGmailEmails...`);
    const syncResult = await RealTimeEmailSyncService.syncGmailEmails(account, historyId);

    if (syncResult.success) {
      console.log(`✅ [${requestId}] Gmail sync completed successfully for: ${account.emailAddress}`, {
        emailsProcessed: syncResult.emailsProcessed,
      });
      logger.info(`[${requestId}] Gmail sync completed successfully for: ${account.emailAddress}`, {
        emailsProcessed: syncResult.emailsProcessed,
      });

      return {
        success: true,
        data: {
          accountId: account._id,
          emailAddress: account.emailAddress,
          historyId: historyId,
          emailsProcessed: syncResult.emailsProcessed,
          syncType: type || "webhook",
          note: "Processed for receiver account, sender was: " + emailAddress,
        },
      };
    } else {
      console.log(`❌ [${requestId}] Gmail sync failed for: ${account.emailAddress}`, {
        error: syncResult.error,
      });
      logger.error(`[${requestId}] Gmail sync failed for: ${account.emailAddress}`, {
        error: syncResult.error,
      });

      return {
        success: false,
        error: syncResult.error,
      };
    }
  } catch (error: any) {
    console.log(`💥 [${requestId}] Error processing Gmail notification:`, error);
    logger.error(`[${requestId}] Error processing Gmail notification:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}
