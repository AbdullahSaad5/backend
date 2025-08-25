import { EmailFetchingService } from "./email-fetching.service";
import { EmailAccountModel } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";
import { google } from "googleapis";
import { getStoredGmailAuthClient } from "@/utils/gmail-helpers.util";

export interface ManualSyncResult {
  success: boolean;
  message: string;
  data?: {
    accountId: string;
    emailAddress: string;
    batchNumber: number;
    emailsProcessed: number;
    totalEmailsInBatch: number;
    hasMoreEmails: boolean;
    nextPageToken?: string;
    progress: {
      totalProcessed: number;
      estimatedTotal: number;
      percentage: number;
    };
  };
  error?: string;
}

export interface ManualSyncProgress {
  accountId: string;
  emailAddress: string;
  isProcessing: boolean;
  currentBatch: number;
  totalProcessed: number;
  estimatedTotal: number;
  percentage: number;
  lastProcessedAt: Date;
  nextPageToken?: string;
  hasMoreEmails: boolean;
}

export class ManualEmailSyncService {
  private static readonly BATCH_SIZE = 100; // Process 100 emails per batch
  private static readonly RATE_LIMIT_DELAY = 2000; // 2 seconds between API calls

  /**
   * Start manual sync for a specific account
   */
  static async startManualSync(accountId: string): Promise<ManualSyncResult> {
    try {
      logger.info(`Starting manual sync for account: ${accountId}`);

      const account = await EmailAccountModel.findById(accountId);
      if (!account) {
        return {
          success: false,
          message: "Account not found",
          error: "Account not found",
        };
      }

      if (account.accountType !== "gmail" || !account.oauth) {
        return {
          success: false,
          message: "Account doesn't support Gmail sync",
          error: "Account doesn't support Gmail sync",
        };
      }

      // Check if account is already being processed
      if (account.syncState?.isProcessing) {
        return {
          success: false,
          message: "Account is already being processed",
          error: "Account is already being processed",
        };
      }

      // Initialize sync state for manual sync
      await EmailAccountModel.findByIdAndUpdate(accountId, {
        $set: {
          "syncState.isProcessing": true,
          "syncState.manualSyncStarted": new Date(),
          "syncState.currentBatch": 1,
          "syncState.totalProcessed": 0,
          "syncState.nextPageToken": null,
        },
      });

      // Process the first batch
      const result = await this.processNextBatch(accountId);

      return {
        success: true,
        message: "Manual sync started successfully",
        data: result,
      };
    } catch (error: any) {
      logger.error(`Manual sync start failed for account ${accountId}:`, error);

      // Reset processing state
      await EmailAccountModel.findByIdAndUpdate(accountId, {
        $set: {
          "syncState.isProcessing": false,
          "syncState.lastError": error.message,
          "syncState.lastErrorAt": new Date(),
        },
      });

      return {
        success: false,
        message: "Failed to start manual sync",
        error: error.message,
      };
    }
  }

  /**
   * Process the next batch of emails
   */
  static async processNextBatch(accountId: string): Promise<ManualSyncResult["data"]> {
    try {
      const account = await EmailAccountModel.findById(accountId);
      if (!account) {
        throw new Error("Account not found");
      }

      logger.info(`Processing batch for account: ${account.emailAddress}`);

      try {
        const gmail = google.gmail({ version: "v1", auth: await EmailFetchingService.getGmailAuthClient(account) });

        // Get current sync state
        const currentBatch = account.syncState?.currentBatch || 1;
        const totalProcessed = account.syncState?.totalProcessed || 0;
        const nextPageToken = account.syncState?.nextPageToken;

        // Fetch message IDs for this batch
        const messagesResponse = await gmail.users.messages.list({
          userId: "me",
          maxResults: this.BATCH_SIZE,
          pageToken: nextPageToken,
          // No date filter - fetch emails in chronological order
        });

        if (!messagesResponse.data.messages || messagesResponse.data.messages.length === 0) {
          // No more emails to process
          await this.completeManualSync(accountId);

          return {
            accountId,
            emailAddress: account.emailAddress,
            batchNumber: currentBatch,
            emailsProcessed: 0,
            totalEmailsInBatch: 0,
            hasMoreEmails: false,
            progress: {
              totalProcessed,
              estimatedTotal: totalProcessed,
              percentage: 100,
            },
          };
        }

        // Process emails in this batch
        const emails: any[] = [];
        const messageIds = messagesResponse.data.messages.map((msg) => msg.id!);

        // Fetch full message details for this batch
        for (const messageId of messageIds) {
          try {
            const messageResponse = await gmail.users.messages.get({
              userId: "me",
              id: messageId,
              format: "full",
            });

            const fetchedEmail = await EmailFetchingService.parseGmailMessage(messageResponse.data, account);
            emails.push(fetchedEmail);

            // Rate limiting
            await this.delay(100); // 100ms between individual message fetches
          } catch (error: any) {
            logger.warn(`Failed to fetch message ${messageId}: ${error.message}`);
          }
        }

        // Store emails in database
        if (emails.length > 0) {
          await EmailFetchingService.storeEmailsInDatabase(emails, account);
        }

        const newTotalProcessed = totalProcessed + emails.length;
        const hasMoreEmails = !!messagesResponse.data.nextPageToken;

        // Update sync state - ALWAYS stop processing after one batch
        await EmailAccountModel.findByIdAndUpdate(accountId, {
          $set: {
            "syncState.currentBatch": currentBatch + 1,
            "syncState.totalProcessed": newTotalProcessed,
            "syncState.nextPageToken": messagesResponse.data.nextPageToken || null,
            "syncState.lastProcessedAt": new Date(),
            "syncState.isProcessing": false, // Always stop after one batch
          },
        });

        // Calculate progress
        const estimatedTotal = hasMoreEmails ? newTotalProcessed + this.BATCH_SIZE : newTotalProcessed;
        const percentage = Math.min((newTotalProcessed / estimatedTotal) * 100, 100);

        logger.info(`Batch ${currentBatch} completed for ${account.emailAddress}: ${emails.length} emails processed`);

        return {
          accountId,
          emailAddress: account.emailAddress,
          batchNumber: currentBatch,
          emailsProcessed: emails.length,
          totalEmailsInBatch: messageIds.length,
          hasMoreEmails,
          nextPageToken: messagesResponse.data.nextPageToken || undefined,
          progress: {
            totalProcessed: newTotalProcessed,
            estimatedTotal,
            percentage: Math.round(percentage),
          },
        };
      } catch (authError: any) {
        // Handle authentication errors specifically
        if (authError.message.includes("Gmail authentication expired") || authError.message.includes("invalid_grant")) {
          logger.error(`Gmail authentication error for account ${accountId}: ${authError.message}`);

          // Reset processing state and mark as error
          await EmailAccountModel.findByIdAndUpdate(accountId, {
            $set: {
              "syncState.isProcessing": false,
              "syncState.lastError": authError.message,
              "syncState.lastErrorAt": new Date(),
            },
          });

          throw new Error(`Gmail authentication failed: ${authError.message}`);
        }

        // Re-throw other errors
        throw authError;
      }
    } catch (error: any) {
      logger.error(`Batch processing failed for account ${accountId}:`, error);

      // Reset processing state
      await EmailAccountModel.findByIdAndUpdate(accountId, {
        $set: {
          "syncState.isProcessing": false,
          "syncState.lastError": error.message,
          "syncState.lastErrorAt": new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Continue manual sync (process next batch)
   */
  static async continueManualSync(accountId: string): Promise<ManualSyncResult> {
    try {
      const account = await EmailAccountModel.findById(accountId);
      if (!account) {
        return {
          success: false,
          message: "Account not found",
          error: "Account not found",
        };
      }

      // Check if there are more emails to process
      if (!account.syncState?.nextPageToken) {
        return {
          success: false,
          message: "No more emails to sync",
          error: "No more emails to sync",
        };
      }

      // Mark as processing for this batch
      await EmailAccountModel.findByIdAndUpdate(accountId, {
        $set: {
          "syncState.isProcessing": true,
        },
      });

      const result = await this.processNextBatch(accountId);

      return {
        success: true,
        message: "Batch processed successfully",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to process batch",
        error: error.message,
      };
    }
  }

  /**
   * Stop manual sync
   */
  static async stopManualSync(accountId: string): Promise<ManualSyncResult> {
    try {
      await EmailAccountModel.findByIdAndUpdate(accountId, {
        $set: {
          "syncState.isProcessing": false,
          "syncState.manualSyncStopped": new Date(),
        },
      });

      return {
        success: true,
        message: "Manual sync stopped successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to stop manual sync",
        error: error.message,
      };
    }
  }

  /**
   * Get manual sync progress
   */
  static async getManualSyncProgress(accountId: string): Promise<ManualSyncProgress | null> {
    try {
      const account = await EmailAccountModel.findById(accountId);
      if (!account || !account.syncState) {
        return null;
      }

      const syncState = account.syncState;
      const estimatedTotal = syncState.totalProcessed + (syncState.nextPageToken ? this.BATCH_SIZE : 0);
      const percentage = Math.min((syncState.totalProcessed / estimatedTotal) * 100, 100);

      return {
        accountId,
        emailAddress: account.emailAddress,
        isProcessing: syncState.isProcessing || false,
        currentBatch: syncState.currentBatch || 0,
        totalProcessed: syncState.totalProcessed || 0,
        estimatedTotal,
        percentage: Math.round(percentage),
        lastProcessedAt: syncState.lastProcessedAt || new Date(),
        nextPageToken: syncState.nextPageToken,
        hasMoreEmails: !!syncState.nextPageToken,
      };
    } catch (error: any) {
      logger.error(`Failed to get manual sync progress for account ${accountId}:`, error);
      return null;
    }
  }

  /**
   * Complete manual sync
   */
  private static async completeManualSync(accountId: string): Promise<void> {
    try {
      const account = await EmailAccountModel.findById(accountId);
      if (!account) return;

      try {
        // Get the latest historyId for future incremental syncs
        const gmail = google.gmail({ version: "v1", auth: await EmailFetchingService.getGmailAuthClient(account) });
        const profileResponse = await gmail.users.getProfile({ userId: "me" });
        const historyId = profileResponse.data.historyId;

        await EmailAccountModel.findByIdAndUpdate(accountId, {
          $set: {
            "syncState.isProcessing": false,
            "syncState.syncStatus": "complete",
            "syncState.lastSyncAt": new Date(),
            "syncState.lastHistoryId": historyId,
            "syncState.manualSyncCompleted": new Date(),
            "syncState.nextPageToken": null,
          },
        });

        logger.info(`Manual sync completed for account: ${account.emailAddress}`);
      } catch (authError: any) {
        // Handle authentication errors
        if (authError.message.includes("Gmail authentication expired") || authError.message.includes("invalid_grant")) {
          logger.error(
            `Gmail authentication error during manual sync completion for account ${accountId}: ${authError.message}`
          );

          await EmailAccountModel.findByIdAndUpdate(accountId, {
            $set: {
              "syncState.isProcessing": false,
              "syncState.lastError": authError.message,
              "syncState.lastErrorAt": new Date(),
            },
          });
        } else {
          throw authError;
        }
      }
    } catch (error: any) {
      logger.error(`Failed to complete manual sync for account ${accountId}:`, error);
    }
  }

  /**
   * Delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
