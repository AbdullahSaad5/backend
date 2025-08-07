import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis"; // Import googleapis
import { EmailProviderService, EMAIL_PROVIDERS } from "@/config/emailProviders";
import { EmailAccountModel, IEmailAccount } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";
import crypto from "crypto";
export interface OAuthState {
  userId: string;
  provider: string;
  emailAddress?: string;
  accountName?: string;
  isPrimary?: boolean;
  timestamp: number;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export class EmailOAuthService {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default_encryption_key_change_in_production";
  private static readonly REDIRECT_URI =
    process.env.OAUTH_REDIRECT_URI || "http://localhost:5000/api/email-account/oauth";

  // Validate environment configuration
  private static validateEnvironment(): void {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      logger.warn("Google OAuth credentials not configured");
    }
    if (!process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_CLIENT_SECRET) {
      logger.warn("Outlook OAuth credentials not configured");
    }
    if (this.ENCRYPTION_KEY === "default_encryption_key_change_in_production") {
      logger.warn("Using default encryption key - change in production!");
    }
  }

  // Encrypt sensitive data
  static encryptData(data: string): string {
    const cipher = crypto.createCipheriv("aes-256-ctr", this.ENCRYPTION_KEY, Buffer.alloc(16, 0));
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  // Decrypt sensitive data
  static decryptData(encryptedData: string | any): string {
    const decipher = crypto.createDecipheriv("aes-256-ctr", this.ENCRYPTION_KEY, Buffer.alloc(16, 0));
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  // Generate OAuth state for security
  static generateOAuthState(
    userId: string,
    provider: string,
    emailAddress?: string,
    accountName?: string,
    isPrimary?: boolean
  ): string {
    const state: OAuthState = {
      userId,
      provider,
      emailAddress,
      accountName,
      isPrimary,
      timestamp: Date.now(),
    };

    const stateString = JSON.stringify(state);
    return Buffer.from(stateString).toString("base64");
  }

  // Parse OAuth state
  static parseOAuthState(stateString: string): OAuthState | null {
    try {
      const stateJson = Buffer.from(stateString, "base64").toString("utf8");
      const state = JSON.parse(stateJson) as OAuthState;

      // Validate state age (should not be older than 1 hour)
      const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
      if (Date.now() - state.timestamp > maxAge) {
        logger.error("OAuth state expired");
        return null;
      }

      return state;
    } catch (error) {
      logger.error("Error parsing OAuth state:", error);
      return null;
    }
  }

  // Generate Google OAuth URL
  static generateGoogleOAuthUrl(
    userId: string,
    emailAddress?: string,
    accountName?: string,
    isPrimary?: boolean
  ): string {
    const provider = EMAIL_PROVIDERS.gmail;

    // Validate OAuth configuration
    if (!provider.oauth?.clientId || !provider.oauth?.clientSecret) {
      throw new Error(
        "Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
      );
    }

    const state = this.generateOAuthState(userId, "gmail", emailAddress, accountName, isPrimary);

    const params = new URLSearchParams({
      client_id: provider.oauth.clientId,
      redirect_uri: `${this.REDIRECT_URI}/google/callback`,
      response_type: "code",
      scope: provider.oauth.scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state: state,
    });

    return `${provider.oauth.authUrl}?${params.toString()}`;
  }

  // Generate Outlook OAuth URL
  static generateOutlookOAuthUrl(
    userId: string,
    emailAddress?: string,
    accountName?: string,
    isPrimary?: boolean
  ): string {
    const provider = EMAIL_PROVIDERS.outlook;
    const state = this.generateOAuthState(userId, "outlook", emailAddress, accountName, isPrimary);

    const params = new URLSearchParams({
      client_id: provider.oauth!.clientId,
      redirect_uri: `${this.REDIRECT_URI}/outlook/callback`,
      response_type: "code",
      scope: provider.oauth!.scopes.join(" "),
      state: state,
    });

    return `${provider.oauth!.authUrl}?${params.toString()}`;
  }

  // Handle Google OAuth callback
  static async handleGoogleCallback(
    code: string,
    state: string
  ): Promise<{ success: boolean; account?: any | IEmailAccount; error?: string }> {
    try {
      const oauthState = this.parseOAuthState(state);
      if (!oauthState) {
        logger.error("Google Callback: Invalid OAuth state received.");
        return { success: false, error: "Invalid OAuth state" };
      }
      logger.info("Google Callback: Parsed OAuth State:", oauthState);

      const provider = EMAIL_PROVIDERS.gmail;
      if (!provider.oauth?.clientId || !provider.oauth?.clientSecret) {
        logger.error("Google Callback: Google OAuth credentials missing in EMAIL_PROVIDERS config.");
        throw new Error("Google OAuth credentials not configured.");
      }

      const redirectUrl = `${this.REDIRECT_URI}/google/callback`;
      logger.info(`Google Callback: Using Redirect URI: ${redirectUrl}`);

      const oauth2Client = new OAuth2Client(provider.oauth.clientId, provider.oauth.clientSecret, redirectUrl);
      logger.info("Google Callback: Initialized OAuth2Client.");

      logger.info("Google Callback: Attempting to get tokens with code:", code);
      const { tokens } = await oauth2Client.getToken(code);
      logger.info("Google Callback: Received raw tokens:", JSON.stringify(tokens));

      if (!tokens.access_token) {
        logger.error("Google Callback: Failed to get access token - access_token missing from response.");
        return { success: false, error: "Failed to get access token" };
      }
      logger.info("Google Callback: Access token obtained. Expires in:", tokens.expiry_date);

      // Set credentials on the client instance for subsequent API calls
      oauth2Client.setCredentials(tokens);
      logger.info(
        "Google Callback: Credentials set on oauth2Client. Current client credentials:",
        oauth2Client.credentials
      );

      // Get user info using Google People API
      logger.info("Google Callback: Attempting to fetch user info from Google People API...");
      const people = google.people({
        auth: oauth2Client,
        version: "v1",
      });

      const userInfoResponse = await people.people.get({
        resourceName: "people/me",
        personFields: "emailAddresses,names",
      });

      const userInfo = userInfoResponse.data;
      logger.info("Google Callback: Received user info response:", JSON.stringify(userInfo));

      // Extract email from People API response
      const emailAddress = userInfo.emailAddresses?.[0]?.value || oauthState.emailAddress;
      const displayName = userInfo.names?.[0]?.displayName || emailAddress;

      if (!emailAddress) {
        logger.error("Google Callback: Email address not found after user info retrieval.");
        return { success: false, error: "Email address not found" };
      }

      // Create or update email account
      const accountData: Partial<IEmailAccount> = {
        userId: oauthState.userId,
        accountName: oauthState.accountName || `Gmail (${emailAddress})`,
        emailAddress,
        displayName: displayName,
        accountType: "gmail",
        isActive: true,
        isPrimary: oauthState.isPrimary || false,
        incomingServer: {
          host: provider.incomingServer.host,
          port: provider.incomingServer.port,
          security: provider.incomingServer.security,
          username: emailAddress,
          password: this.encryptData("oauth"),
        },
        outgoingServer: {
          host: provider.outgoingServer.host,
          port: provider.outgoingServer.port,
          security: provider.outgoingServer.security,
          username: emailAddress,
          password: this.encryptData("oauth"),
          requiresAuth: provider.outgoingServer.requiresAuth,
        },
        oauth: {
          provider: "gmail",
          clientId: provider.oauth.clientId,
          clientSecret: this.encryptData(provider.oauth.clientSecret),
          refreshToken: tokens.refresh_token ? this.encryptData(tokens.refresh_token) : undefined,
          accessToken: this.encryptData(tokens.access_token),
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        },
        status: "active",
        connectionStatus: "disconnected",
      };

      // Check if account already exists
      const existingAccount = await EmailAccountModel.findOne({
        userId: oauthState.userId,
        emailAddress,
      });

      let account: IEmailAccount;
      if (existingAccount) {
        // Update existing account
        account = (await EmailAccountModel.findByIdAndUpdate(existingAccount._id, accountData, {
          new: true,
        })) as IEmailAccount;
      } else {
        // Create new account
        account = await EmailAccountModel.create(accountData);
      }

      logger.info(`Google OAuth account created/updated: ${emailAddress}`);
      return { success: true, account };
    } catch (error: any) {
      logger.error("Google OAuth callback overall error:", error);
      return { success: false, error: error.message };
    }
  }
  // Handle Outlook OAuth callback
  static async handleOutlookCallback(
    code: string,
    state: string
  ): Promise<{ success: boolean; account?: IEmailAccount; error?: string }> {
    try {
      const oauthState = this.parseOAuthState(state);
      if (!oauthState) {
        return { success: false, error: "Invalid OAuth state" };
      }

      const provider = EMAIL_PROVIDERS.outlook;

      // Exchange code for tokens
      const tokenResponse = await fetch(provider.oauth!.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: provider.oauth!.clientId,
          client_secret: provider.oauth!.clientSecret,
          code,
          redirect_uri: `${this.REDIRECT_URI}/outlook/callback`,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        logger.error("Outlook token exchange failed:", errorData);
        return { success: false, error: "Failed to exchange authorization code for tokens" };
      }

      const tokens: OAuthTokenResponse = await tokenResponse.json();

      if (!tokens.access_token) {
        return { success: false, error: "Failed to get access token" };
      }

      // Get user info from Microsoft Graph
      const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        return { success: false, error: "Failed to get user info from Microsoft Graph" };
      }

      const userInfo = await userInfoResponse.json();
      const emailAddress = userInfo.mail || userInfo.userPrincipalName || oauthState.emailAddress;

      if (!emailAddress) {
        return { success: false, error: "Email address not found" };
      }

      // Create or update email account
      const accountData: Partial<IEmailAccount> = {
        userId: oauthState.userId,
        accountName: oauthState.accountName || `Outlook (${emailAddress})`,
        emailAddress,
        displayName: userInfo.displayName || emailAddress,
        accountType: "outlook",
        isActive: true,
        isPrimary: oauthState.isPrimary || false,
        incomingServer: {
          host: provider.incomingServer.host,
          port: provider.incomingServer.port,
          security: provider.incomingServer.security,
          username: emailAddress,
          password: this.encryptData("oauth"),
        },
        outgoingServer: {
          host: provider.outgoingServer.host,
          port: provider.outgoingServer.port,
          security: provider.outgoingServer.security,
          username: emailAddress,
          password: this.encryptData("oauth"),
          requiresAuth: provider.outgoingServer.requiresAuth,
        },
        oauth: {
          provider: "outlook",
          clientId: provider.oauth!.clientId,
          clientSecret: this.encryptData(provider.oauth!.clientSecret),
          refreshToken: tokens.refresh_token ? this.encryptData(tokens.refresh_token) : undefined,
          accessToken: this.encryptData(tokens.access_token),
          tokenExpiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
        },
        status: "active",
        connectionStatus: "disconnected",
      };

      // Check if account already exists
      const existingAccount = await EmailAccountModel.findOne({
        userId: oauthState.userId,
        emailAddress,
      });

      let account: IEmailAccount;
      if (existingAccount) {
        // Update existing account
        account = (await EmailAccountModel.findByIdAndUpdate(existingAccount._id, accountData, {
          new: true,
        })) as IEmailAccount;
      } else {
        // Create new account
        account = await EmailAccountModel.create(accountData);
      }

      logger.info(`Outlook OAuth account created/updated: ${emailAddress}`);
      return { success: true, account };
    } catch (error: any) {
      logger.error("Outlook OAuth callback error:", error);
      return { success: false, error: error.message };
    }
  }

  // Refresh OAuth tokens
  static async refreshTokens(account: IEmailAccount): Promise<{ success: boolean; error?: string }> {
    try {
      if (!account.oauth?.refreshToken) {
        return { success: false, error: "No refresh token available" };
      }

      const provider = EmailProviderService.getProvider(account.oauth.provider);
      if (!provider?.oauth) {
        return { success: false, error: "Provider not found" };
      }

      // Decrypt stored tokens and secrets
      const decryptedRefreshToken = this.decryptData(account.oauth.refreshToken);
      const decryptedClientSecret = this.decryptData(account.oauth.clientSecret);

      if (account.oauth.provider === "gmail") {
        const oauth2Client = new OAuth2Client(provider.oauth.clientId, decryptedClientSecret);

        oauth2Client.setCredentials({
          refresh_token: decryptedRefreshToken,
        });

        const { tokens }: any = await oauth2Client.refreshAccessToken();

        // Update account with new encrypted tokens
        await EmailAccountModel.findByIdAndUpdate(account._id, {
          "oauth.accessToken": this.encryptData(tokens.access_token),
          "oauth.tokenExpiry": tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        });
      } else if (account.oauth.provider === "outlook") {
        const response = await fetch(provider.oauth.tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: provider.oauth.clientId,
            client_secret: decryptedClientSecret,
            refresh_token: decryptedRefreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error("Failed to refresh Outlook token:", errorText);
          throw new Error(`Failed to refresh Outlook token: ${response.status}`);
        }

        const tokens: OAuthTokenResponse = await response.json();

        // Update account with new encrypted tokens
        await EmailAccountModel.findByIdAndUpdate(account._id, {
          "oauth.accessToken": this.encryptData(tokens.access_token),
          "oauth.refreshToken": tokens.refresh_token
            ? this.encryptData(tokens.refresh_token)
            : account.oauth.refreshToken,
          "oauth.tokenExpiry": tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
        });
      }

      return { success: true };
    } catch (error: any) {
      logger.error("Token refresh error:", error);
      return { success: false, error: error.message };
    }
  }

  // Get decrypted access token for use in email operations
  static getDecryptedAccessToken(account: IEmailAccount): string | null {
    try {
      if (!account.oauth?.accessToken) {
        return null;
      }
      return this.decryptData(account.oauth.accessToken);
    } catch (error) {
      logger.error("Error decrypting access token:", error);
      return null;
    }
  }
}
