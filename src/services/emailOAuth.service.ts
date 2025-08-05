import { OAuth2Client } from "google-auth-library";
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
    process.env.OAUTH_REDIRECT_URI || "http://localhost:3000/api/email-accounts/oauth";

  // Encrypt sensitive data
  static encryptData(data: string): string {
    const cipher = crypto.createCipheriv("aes-256-ctr", this.ENCRYPTION_KEY, Buffer.alloc(16, 0));
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  // Decrypt sensitive data
  static decryptData(encryptedData: string): string {
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
      return JSON.parse(stateJson) as OAuthState;
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
    const state = this.generateOAuthState(userId, "gmail", emailAddress, accountName, isPrimary);

    const params = new URLSearchParams({
      client_id: provider.oauth!.clientId,
      redirect_uri: `${this.REDIRECT_URI}/google/callback`,
      response_type: "code",
      scope: provider.oauth!.scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state: state,
    });

    return `${provider.oauth!.authUrl}?${params.toString()}`;
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
  ): Promise<{ success: boolean; account?: IEmailAccount; error?: string }> {
    try {
      const oauthState = this.parseOAuthState(state);
      if (!oauthState) {
        return { success: false, error: "Invalid OAuth state" };
      }

      const provider = EMAIL_PROVIDERS.gmail;
      const oauth2Client = new OAuth2Client(
        provider.oauth!.clientId,
        provider.oauth!.clientSecret,
        `${this.REDIRECT_URI}/google/callback`
      );

      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token) {
        return { success: false, error: "Failed to get access token" };
      }

      // Get user info from Google
      oauth2Client.setCredentials(tokens);
      const oauth2 = new OAuth2Client();
      oauth2.setCredentials({ access_token: tokens.access_token });

      const userInfoResponse = await oauth2.request({
        url: "https://www.googleapis.com/oauth2/v2/userinfo",
      });

      const userInfo = userInfoResponse.data as any;
      const emailAddress = userInfo.email || oauthState.emailAddress;

      if (!emailAddress) {
        return { success: false, error: "Email address not found" };
      }

      // Create or update email account
      const accountData: Partial<IEmailAccount> = {
        userId: oauthState.userId,
        accountName: oauthState.accountName || `Gmail (${emailAddress})`,
        emailAddress,
        displayName: userInfo.name || emailAddress,
        accountType: "gmail",
        isActive: true,
        isPrimary: oauthState.isPrimary || false,
        incomingServer: {
          host: provider.incomingServer.host,
          port: provider.incomingServer.port,
          security: provider.incomingServer.security,
          username: emailAddress,
          password: this.encryptData("oauth"), // Use OAuth instead of password
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
          clientId: provider.oauth!.clientId,
          clientSecret: provider.oauth!.clientSecret,
          refreshToken: tokens.refresh_token || undefined,
          accessToken: tokens.access_token,
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
      logger.error("Google OAuth callback error:", error);
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
          clientSecret: provider.oauth!.clientSecret,
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token,
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

      if (account.oauth.provider === "gmail") {
        const oauth2Client = new OAuth2Client(provider.oauth.clientId, provider.oauth.clientSecret);

        oauth2Client.setCredentials({
          refresh_token: account.oauth.refreshToken,
        });

        const { tokens }: any = await oauth2Client.refreshAccessToken();

        // Update account with new tokens
        await EmailAccountModel.findByIdAndUpdate(account._id, {
          "oauth.accessToken": tokens.access_token,
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
            client_secret: provider.oauth.clientSecret,
            refresh_token: account.oauth.refreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to refresh Outlook token");
        }

        const tokens: OAuthTokenResponse = await response.json();

        // Update account with new tokens
        await EmailAccountModel.findByIdAndUpdate(account._id, {
          "oauth.accessToken": tokens.access_token,
          "oauth.tokenExpiry": tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
        });
      }

      return { success: true };
    } catch (error: any) {
      logger.error("Token refresh error:", error);
      return { success: false, error: error.message };
    }
  }
}
