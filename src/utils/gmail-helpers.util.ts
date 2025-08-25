import { google } from "googleapis";
import { IEmailAccount } from "@/models/email-account.model";
import { EmailOAuthService } from "@/services/emailOAuth.service";
import { logger } from "@/utils/logger.util";

export interface GmailAuthResult {
  success: boolean;
  oauth2Client?: any;
  error?: string;
  requiresReAuth?: boolean;
}

/**
 * Centralized Gmail authentication helper that handles token validation and refresh
 * Follows the same pattern as Amazon and eBay helpers for consistent error handling
 */
export const getStoredGmailAuthClient = async (emailAccount: IEmailAccount): Promise<GmailAuthResult> => {
  try {
    if (!emailAccount.oauth?.refreshToken) {
      logger.error(`No refresh token available for ${emailAccount.emailAddress}`);
      return {
        success: false,
        error: "No refresh token available",
        requiresReAuth: true,
      };
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Decrypt tokens
    const decryptedRefreshToken = EmailOAuthService.decryptData(emailAccount.oauth.refreshToken);
    const decryptedAccessToken = emailAccount.oauth?.accessToken
      ? EmailOAuthService.decryptData(emailAccount.oauth.accessToken)
      : null;

    // Check if we have a valid access token and if it's expired
    let shouldRefreshToken = false;

    if (decryptedAccessToken && emailAccount.oauth?.tokenExpiry) {
      const now = new Date();
      const expiryDate = new Date(emailAccount.oauth.tokenExpiry);
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();

      // Refresh token if it expires in less than 5 minutes (300,000 ms)
      shouldRefreshToken = timeUntilExpiry < 300000;

      logger.info(
        `Token expiry check for ${emailAccount.emailAddress}: expires in ${Math.round(timeUntilExpiry / 1000)}s, should refresh: ${shouldRefreshToken}`
      );
    } else if (!decryptedAccessToken) {
      // No access token, need to refresh
      shouldRefreshToken = true;
      logger.info(`No access token available for ${emailAccount.emailAddress}, will refresh`);
    }

    if (shouldRefreshToken) {
      // Only refresh when necessary
      logger.info(`Refreshing access token for ${emailAccount.emailAddress}`);

      // Set credentials with refresh token
      oauth2Client.setCredentials({
        refresh_token: decryptedRefreshToken,
      });

      try {
        const { credentials } = await oauth2Client.refreshAccessToken();

        if (credentials.access_token) {
          // Update the account with the new access token
          const expiryDate = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined;
          await updateGmailAccessToken(emailAccount, credentials.access_token, expiryDate);

          oauth2Client.setCredentials({
            access_token: credentials.access_token,
            refresh_token: decryptedRefreshToken,
          });

          logger.info(`Successfully refreshed Gmail access token for ${emailAccount.emailAddress}`);
        } else {
          throw new Error("Failed to obtain access token from refresh token");
        }
      } catch (refreshError: any) {
        logger.error(`Failed to refresh Gmail access token for ${emailAccount.emailAddress}:`, refreshError);

        // Check if this is an invalid_grant error (refresh token expired/revoked)
        if (refreshError.message.includes("invalid_grant") || refreshError.code === 400) {
          // Update account status to indicate re-authentication is needed
          await updateGmailAccountError(
            emailAccount,
            "Gmail authentication expired. Please re-authenticate your account."
          );

          return {
            success: false,
            error: "Gmail authentication expired. Please re-authenticate your account.",
            requiresReAuth: true,
          };
        }

        // If refresh fails for other reasons, try to use existing access token if available
        if (decryptedAccessToken) {
          oauth2Client.setCredentials({
            access_token: decryptedAccessToken,
            refresh_token: decryptedRefreshToken,
          });

          logger.warn(`Using existing access token for ${emailAccount.emailAddress} (refresh failed)`);
        } else {
          return {
            success: false,
            error: `Gmail authentication failed: ${refreshError.message}`,
            requiresReAuth: true,
          };
        }
      }
    } else {
      // Use existing valid access token
      logger.info(`Using existing valid access token for ${emailAccount.emailAddress}`);

      oauth2Client.setCredentials({
        access_token: decryptedAccessToken,
        refresh_token: decryptedRefreshToken,
      });
    }

    // Test the token with a simple API call to validate it
    try {
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      await gmail.users.getProfile({ userId: "me" });
      logger.info(`Gmail token validation successful for ${emailAccount.emailAddress}`);
    } catch (validationError: any) {
      // If token is invalid (401), handle it centrally
      if (validationError.code === 401 || validationError.message.includes("invalid_grant")) {
        logger.warn(`Gmail token validation failed for ${emailAccount.emailAddress}, clearing invalid token`);

        // Clear the invalid access token but keep refresh token
        await clearGmailAccessToken(emailAccount);

        return {
          success: false,
          error: "Gmail authentication expired. Please re-authenticate your account.",
          requiresReAuth: true,
        };
      } else {
        logger.warn(`Gmail token validation failed for ${emailAccount.emailAddress}:`, validationError.message);
        // Continue with the token even if validation fails (might be a temporary issue)
      }
    }

    return {
      success: true,
      oauth2Client,
    };
  } catch (error: any) {
    logger.error(`Gmail authentication error for ${emailAccount.emailAddress}:`, error);
    return {
      success: false,
      error: `Gmail authentication failed: ${error.message}`,
      requiresReAuth: true,
    };
  }
};

/**
 * Update Gmail access token in the database
 */
const updateGmailAccessToken = async (
  emailAccount: IEmailAccount,
  accessToken: string,
  expiryDate?: Date
): Promise<void> => {
  try {
    const { EmailAccountModel } = await import("@/models/email-account.model");

    await EmailAccountModel.updateOne(
      { _id: emailAccount._id },
      {
        $set: {
          "oauth.accessToken": EmailOAuthService.encryptData(accessToken),
          "oauth.tokenExpiry": expiryDate,
          connectionStatus: "connected",
          "stats.lastTokenRefresh": new Date(),
        },
      }
    );

    logger.info(`Updated Gmail access token for ${emailAccount.emailAddress}`);
  } catch (error: any) {
    logger.error(`Failed to update Gmail access token for ${emailAccount.emailAddress}:`, error);
    throw error;
  }
};

/**
 * Clear Gmail access token from the database (keep refresh token)
 */
const clearGmailAccessToken = async (emailAccount: IEmailAccount): Promise<void> => {
  try {
    const { EmailAccountModel } = await import("@/models/email-account.model");

    await EmailAccountModel.updateOne(
      { _id: emailAccount._id },
      {
        $unset: {
          "oauth.accessToken": "",
          "oauth.tokenExpiry": "",
        },
        $set: {
          connectionStatus: "error",
          "stats.lastError": "Gmail authentication expired. Please re-authenticate your account.",
        },
      }
    );

    logger.info(`Cleared Gmail access token for ${emailAccount.emailAddress}`);
  } catch (error: any) {
    logger.error(`Failed to clear Gmail access token for ${emailAccount.emailAddress}:`, error);
    throw error;
  }
};

/**
 * Update Gmail account error status
 */
const updateGmailAccountError = async (emailAccount: IEmailAccount, errorMessage: string): Promise<void> => {
  try {
    const { EmailAccountModel } = await import("@/models/email-account.model");

    await EmailAccountModel.updateOne(
      { _id: emailAccount._id },
      {
        $set: {
          connectionStatus: "error",
          "stats.lastError": errorMessage,
          "stats.lastErrorAt": new Date(),
        },
      }
    );

    logger.info(`Updated Gmail account error status for ${emailAccount.emailAddress}: ${errorMessage}`);
  } catch (error: any) {
    logger.error(`Failed to update Gmail account error status for ${emailAccount.emailAddress}:`, error);
    throw error;
  }
};
