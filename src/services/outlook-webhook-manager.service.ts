import { IEmailAccount, EmailAccountModel } from "@/models/email-account.model";
import { EmailOAuthService } from "@/services/emailOAuth.service";
import { logger } from "@/utils/logger.util";
import crypto from "crypto";
import { getOutlookWebhookUrl } from "@/config/instance-config";

export interface OutlookWebhookInfo {
  webhookId: string;
  webhookUrl: string;
  subscriptionExpiry: Date;
  emailPrefix: string;
  webhookHash: string;
}

export class OutlookWebhookManager {
  /**
   * Generate a unique webhook identifier using email prefix first, account ID as fallback
   * This ensures each account has a unique identifier with email prefix priority
   */
  static generateWebhookHash(accountId: string, emailAddress: string): string {
    const emailPrefix = this.getEmailPrefix(emailAddress);
    // Use email prefix as primary, account ID as secondary for uniqueness
    const data = `${emailPrefix}-${accountId}-${Date.now()}`;
    return crypto.createHash("sha256").update(data).digest("hex").substring(0, 12);
  }

  /**
   * Get email prefix from email address
   */
  static getEmailPrefix(emailAddress: string): string {
    return emailAddress
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  /**
   * Generate account-specific webhook URL using email prefix first, webhook hash as fallback
   */
  static generateWebhookUrl(emailPrefix: string, webhookHash: string): string | null {
    const baseUrl = getOutlookWebhookUrl();
    if (!baseUrl) {
      logger.warn("⚠️ [Outlook] No base webhook URL configured");
      return null;
    }
    // Use email prefix as primary identifier in URL
    // Microsoft Graph will validate this endpoint by sending a GET request with validationToken
    return `${baseUrl}/${emailPrefix}`;
  }

  /**
   * Create webhook subscription for an account
   */
  static async createWebhookSubscription(
    account: IEmailAccount,
    accessToken: string
  ): Promise<OutlookWebhookInfo | null> {
    try {
      const emailPrefix = this.getEmailPrefix(account.emailAddress);
      const webhookHash = this.generateWebhookHash(account._id?.toString() || "", account.emailAddress);
      const webhookUrl = this.generateWebhookUrl(emailPrefix, webhookHash);

      if (!webhookUrl) {
        throw new Error("Cannot generate webhook URL - base URL not configured");
      }

      logger.info(`📧 [Outlook] Creating webhook subscription for: ${account.emailAddress}`, {
        emailPrefix,
        webhookHash,
        webhookUrl,
      });

      // Check if subscription already exists and is valid
      const existingSubscription = await this.checkExistingSubscription(account, accessToken);
      if (existingSubscription && this.isSubscriptionValid(existingSubscription)) {
        logger.info(`✅ [Outlook] Valid subscription already exists for: ${account.emailAddress}`);
        return existingSubscription;
      }

      // Clean up any existing invalid subscriptions
      if (existingSubscription) {
        await this.deleteWebhookSubscription(account, accessToken);
      }

      const subscriptionPayload = {
        changeType: "created,updated",
        notificationUrl: webhookUrl,
        resource: "/me/messages",
        expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        clientState: emailPrefix, // Use email prefix for identification
      };

      // Add retry logic with exponential backoff for rate limiting
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      const baseDelay = 2000; // 2 seconds

      while (retryCount <= maxRetries) {
        try {
          response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(subscriptionPayload),
          });

          if (response.ok) {
            break; // Success, exit retry loop
          }

          // Handle rate limiting specifically
          if (response.status === 429) {
            retryCount++;
            if (retryCount <= maxRetries) {
              const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff
              logger.warn(
                `⚠️ [Outlook] Rate limited (429), retrying in ${delay}ms (attempt ${retryCount}/${maxRetries}) for: ${account.emailAddress}`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
          }

          // For other errors, don't retry
          break;
        } catch (fetchError: any) {
          retryCount++;
          if (retryCount <= maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount - 1);
            logger.warn(
              `⚠️ [Outlook] Fetch error, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries}): ${fetchError.message}`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw fetchError;
        }
      }

      if (!response || !response.ok) {
        const errorText = (await response?.text()) || "No response";

        // Provide specific guidance for rate limiting
        if (response?.status === 429) {
          throw new Error(
            `Rate limited by Microsoft Graph. Please wait before creating more webhooks. Error: ${errorText}`
          );
        }

        throw new Error(`Failed to create subscription: ${response?.status} ${errorText}`);
      }

      const subscription = await response.json();

      const webhookInfo: OutlookWebhookInfo = {
        webhookId: subscription.id,
        webhookUrl,
        subscriptionExpiry: new Date(subscription.expirationDateTime),
        emailPrefix,
        webhookHash,
      };

      // Update account with webhook information
      await EmailAccountModel.findByIdAndUpdate(account._id, {
        $set: {
          "syncState.webhookId": webhookInfo.webhookId,
          "syncState.webhookUrl": webhookInfo.webhookUrl,
          "syncState.subscriptionExpiry": webhookInfo.subscriptionExpiry,
          "syncState.emailPrefix": webhookInfo.emailPrefix,
          "syncState.webhookHash": webhookInfo.webhookHash,
          "syncState.lastWebhookValidation": new Date(),
          "syncState.isWatching": true,
        },
      });

      logger.info(`✅ [Outlook] Webhook subscription created successfully for: ${account.emailAddress}`, {
        subscriptionId: webhookInfo.webhookId,
        expiresAt: webhookInfo.subscriptionExpiry,
        webhookHash: webhookInfo.webhookHash,
      });

      return webhookInfo;
    } catch (error: any) {
      logger.error(`❌ [Outlook] Failed to create webhook subscription for ${account.emailAddress}:`, error);
      return null;
    }
  }

  /**
   * Check if existing subscription is valid
   */
  private static isSubscriptionValid(subscription: OutlookWebhookInfo): boolean {
    const now = new Date();
    const expiryBuffer = 12 * 60 * 60 * 1000; // 12 hours buffer
    return subscription.subscriptionExpiry.getTime() > now.getTime() + expiryBuffer;
  }

  /**
   * Check for existing webhook subscription
   */
  private static async checkExistingSubscription(
    account: IEmailAccount,
    accessToken: string
  ): Promise<OutlookWebhookInfo | null> {
    try {
      if (!account.syncState?.webhookId) {
        return null;
      }

      const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${account.syncState.webhookId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const subscription = await response.json();
        return {
          webhookId: subscription.id,
          webhookUrl: account.syncState.webhookUrl || "",
          subscriptionExpiry: new Date(subscription.expirationDateTime),
          emailPrefix: account.syncState.emailPrefix || this.getEmailPrefix(account.emailAddress),
          webhookHash: account.syncState.webhookHash || "",
        };
      }

      return null;
    } catch (error) {
      logger.warn(`⚠️ [Outlook] Error checking existing subscription for ${account.emailAddress}:`, error);
      return null;
    }
  }

  /**
   * Delete webhook subscription
   */
  static async deleteWebhookSubscription(account: IEmailAccount, accessToken: string): Promise<boolean> {
    try {
      if (!account.syncState?.webhookId) {
        logger.info(`ℹ️ [Outlook] No webhook ID to delete for: ${account.emailAddress}`);
        return true;
      }

      logger.info(`🧹 [Outlook] Deleting webhook subscription for: ${account.emailAddress}`, {
        webhookId: account.syncState.webhookId,
      });

      const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${account.syncState.webhookId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok || response.status === 404) {
        logger.info(`✅ [Outlook] Webhook subscription deleted for: ${account.emailAddress}`);

        // Clear webhook data from account
        await EmailAccountModel.findByIdAndUpdate(account._id, {
          $unset: {
            "syncState.webhookId": 1,
            "syncState.webhookUrl": 1,
            "syncState.subscriptionExpiry": 1,
            "syncState.emailPrefix": 1,
            "syncState.webhookHash": 1,
            "syncState.lastWebhookValidation": 1,
          },
          $set: {
            "syncState.isWatching": false,
          },
        });

        return true;
      } else {
        const errorText = await response.text();
        logger.error(
          `❌ [Outlook] Failed to delete webhook subscription for ${account.emailAddress}: ${response.status} ${errorText}`
        );
        return false;
      }
    } catch (error: any) {
      logger.error(`❌ [Outlook] Error deleting webhook subscription for ${account.emailAddress}:`, error);
      return false;
    }
  }

  /**
   * Find account by email prefix (primary) or webhook hash (secondary)
   */
  static async findAccountByEmailPrefix(emailPrefix: string): Promise<IEmailAccount | null> {
    try {
      // First try to find by email prefix
      let account = await EmailAccountModel.findOne({
        "syncState.emailPrefix": emailPrefix,
        "oauth.provider": "outlook",
        isActive: true,
      });

      // If not found, try by webhook hash as fallback
      if (!account) {
        account = await EmailAccountModel.findOne({
          "syncState.webhookHash": emailPrefix, // In case emailPrefix is actually a hash
          "oauth.provider": "outlook",
          isActive: true,
        });
      }

      return account;
    } catch (error) {
      logger.error(`❌ [Outlook] Error finding account by email prefix ${emailPrefix}:`, error);
      return null;
    }
  }

  /**
   * Validate webhook endpoint accessibility
   */
  static async validateWebhookEndpoint(webhookUrl: string): Promise<boolean> {
    try {
      const healthUrl = `${webhookUrl}/health`;

      // Use AbortController for timeout functionality
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      logger.warn(`⚠️ [Outlook] Webhook endpoint validation failed for ${webhookUrl}:`, error);
      return false;
    }
  }

  /**
   * Renew webhook subscription before expiry
   */
  static async renewWebhookSubscription(account: IEmailAccount, accessToken: string): Promise<boolean> {
    try {
      if (!account.syncState?.webhookId || !account.syncState?.subscriptionExpiry) {
        logger.warn(`⚠️ [Outlook] Cannot renew webhook - missing subscription info for: ${account.emailAddress}`);
        return false;
      }

      const newExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

      const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${account.syncState.webhookId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expirationDateTime: newExpiry.toISOString(),
        }),
      });

      if (response.ok) {
        await EmailAccountModel.findByIdAndUpdate(account._id, {
          $set: {
            "syncState.subscriptionExpiry": newExpiry,
            "syncState.lastWebhookValidation": new Date(),
          },
        });

        logger.info(`✅ [Outlook] Webhook subscription renewed for: ${account.emailAddress}`, {
          newExpiry: newExpiry.toISOString(),
        });

        return true;
      } else {
        const errorText = await response.text();
        logger.error(
          `❌ [Outlook] Failed to renew webhook subscription for ${account.emailAddress}: ${response.status} ${errorText}`
        );
        return false;
      }
    } catch (error: any) {
      logger.error(`❌ [Outlook] Error renewing webhook subscription for ${account.emailAddress}:`, error);
      return false;
    }
  }

  /**
   * Clean up all webhook subscriptions for an account (used during account deletion)
   */
  static async cleanupAccountWebhooks(account: IEmailAccount): Promise<void> {
    try {
      logger.info(`🧹 [Outlook] Starting webhook cleanup for account: ${account.emailAddress}`);

      // Get access token for cleanup
      const accessToken = EmailOAuthService.getDecryptedAccessToken(account) || undefined;
      if (!accessToken) {
        logger.warn(`⚠️ [Outlook] No access token available for webhook cleanup: ${account.emailAddress}`);
        return;
      }

      // Delete the webhook subscription
      await this.deleteWebhookSubscription(account, accessToken);

      logger.info(`✅ [Outlook] Webhook cleanup completed for: ${account.emailAddress}`);
    } catch (error: any) {
      logger.error(`❌ [Outlook] Webhook cleanup failed for ${account.emailAddress}:`, error);
      throw error;
    }
  }
}
