import nodemailer from "nodemailer";
import { EmailAccountModel, IEmailAccount } from "@/models/email-account.model";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { logger } from "@/utils/logger.util";
import Imap from "imap";

export interface EmailConnectionResult {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
}

export interface EmailSyncResult {
  success: boolean;
  emailCount: number;
  error?: string;
  emails?: any[];
}

export class EmailAccountConfigService {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default_encryption_key_change_in_production";

  // Encrypt password for storage
  static encryptPassword(plainText: string): string {
    try {
      const cipher = crypto.createCipheriv("aes-256-ctr", this.ENCRYPTION_KEY, Buffer.alloc(16, 0));
      let encrypted = cipher.update(plainText, "utf8", "hex");
      encrypted += cipher.final("hex");
      return encrypted;
    } catch (error) {
      logger.error("Error encrypting password:", error);
      throw new Error("Failed to encrypt password");
    }
  }

  // Decrypt password for use
  static decryptPassword(cipherText: string): string {
    try {
      const decipher = crypto.createDecipheriv("aes-256-ctr", this.ENCRYPTION_KEY, Buffer.alloc(16, 0));
      let decrypted = decipher.update(cipherText, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      logger.error("Error decrypting password:", error);
      throw new Error("Failed to decrypt password");
    }
  }

  // Create SMTP transporter for sending emails
  static async createSMTPTransporter(emailAccount: IEmailAccount): Promise<nodemailer.Transporter> {
    const { accountType, outgoingServer, oauth } = emailAccount;

    try {
      // Gmail OAuth configuration
      if (oauth?.provider === "gmail" && oauth.clientId && oauth.clientSecret && oauth.refreshToken) {
        // Decrypt tokens before using them
        const { EmailOAuthService } = await import("@/services/emailOAuth.service");
        const decryptedClientSecret = EmailOAuthService.decryptData(oauth.clientSecret);
        const decryptedRefreshToken = EmailOAuthService.decryptData(oauth.refreshToken);
        const decryptedAccessToken = EmailOAuthService.getDecryptedAccessToken(emailAccount);

        const oAuth2Client = new OAuth2Client(oauth.clientId, decryptedClientSecret);
        oAuth2Client.setCredentials({ 
          refresh_token: decryptedRefreshToken,
          access_token: decryptedAccessToken
        });

        // Get fresh access token if needed
        const accessTokenResponse = await oAuth2Client.getAccessToken();

        return nodemailer.createTransport({
          service: "gmail",
          auth: {
            type: "OAuth2",
            user: emailAccount.emailAddress,
            clientId: oauth.clientId,
            clientSecret: decryptedClientSecret,
            refreshToken: decryptedRefreshToken,
            accessToken: accessTokenResponse.token || decryptedAccessToken || "",
          },
        } as any);
      }

      // Outlook OAuth configuration
      if (oauth?.provider === "outlook" && oauth.clientId && oauth.clientSecret && oauth.refreshToken) {
        // Decrypt tokens before using them
        const { EmailOAuthService } = await import("@/services/emailOAuth.service");
        const decryptedClientSecret = EmailOAuthService.decryptData(oauth.clientSecret);
        const decryptedRefreshToken = EmailOAuthService.decryptData(oauth.refreshToken);
        const decryptedAccessToken = EmailOAuthService.getDecryptedAccessToken(emailAccount);

        return nodemailer.createTransport({
          host: "smtp.office365.com",
          port: 587,
          secure: false,
          auth: {
            type: "OAuth2",
            user: emailAccount.emailAddress,
            clientId: oauth.clientId,
            clientSecret: decryptedClientSecret,
            refreshToken: decryptedRefreshToken,
            accessToken: decryptedAccessToken || "",
          },
        } as any);
      }

      // Standard SMTP configuration
      const config: any = {
        host: outgoingServer.host,
        port: outgoingServer.port,
        secure: outgoingServer.security === "ssl" || outgoingServer.port === 465,
        auth: outgoingServer.requiresAuth
          ? {
              user: outgoingServer.username,
              pass: this.decryptPassword(outgoingServer.password),
            }
          : undefined,
      };

      // Add TLS configuration if needed
      if (outgoingServer.security === "tls" || outgoingServer.security === "starttls") {
        config.requireTLS = true;
        config.tls = {
          ciphers: "SSLv3",
          rejectUnauthorized: false,
        };
      }

      return nodemailer.createTransport(config);
    } catch (error: any) {
      logger.error("Error creating SMTP transporter:", error);
      throw new Error(`Failed to create SMTP transporter: ${error.message}`);
    }
  }

  // Create IMAP connection for receiving emails
  static createIMAPConnection(emailAccount: IEmailAccount): Imap {
    const { incomingServer } = emailAccount;

    const config: Imap.Config = {
      user: incomingServer.username,
      password: this.decryptPassword(incomingServer.password),
      host: incomingServer.host,
      port: incomingServer.port,
      tls: incomingServer.security === "ssl" || incomingServer.security === "tls",
      tlsOptions: {
        rejectUnauthorized: false,
      },
    };

    return new Imap(config);
  }

  // Test SMTP connection
  static async testSMTPConnection(emailAccount: IEmailAccount): Promise<EmailConnectionResult> {
    try {
      const transporter = await this.createSMTPTransporter(emailAccount);
      await transporter.verify();

      logger.info(`SMTP connection successful for ${emailAccount.emailAddress}`);

      // Update account status
      await EmailAccountModel.findByIdAndUpdate(emailAccount._id, {
        connectionStatus: "connected",
        lastTestedAt: new Date(),
        "stats.lastErrorAt": null,
        "stats.lastError": null,
      });

      return {
        success: true,
        message: "SMTP connection successful",
      };
    } catch (error: any) {
      logger.error(`SMTP connection failed for ${emailAccount.emailAddress}:`, error);

      // Update account status
      await EmailAccountModel.findByIdAndUpdate(emailAccount._id, {
        connectionStatus: "error",
        lastTestedAt: new Date(),
        "stats.lastErrorAt": new Date(),
        "stats.lastError": error.message,
      });

      return {
        success: false,
        message: "SMTP connection failed",
        error: error.message,
      };
    }
  }

  // Test IMAP connection
  static async testIMAPConnection(emailAccount: IEmailAccount): Promise<EmailConnectionResult> {
    return new Promise((resolve) => {
      try {
        const imap = this.createIMAPConnection(emailAccount);

        imap.once("ready", async () => {
          logger.info(`IMAP connection successful for ${emailAccount.emailAddress}`);
          imap.end();

          // Update account status
          await EmailAccountModel.findByIdAndUpdate(emailAccount._id, {
            connectionStatus: "connected",
            lastTestedAt: new Date(),
            "stats.lastErrorAt": null,
            "stats.lastError": null,
          });

          resolve({
            success: true,
            message: "IMAP connection successful",
          });
        });

        imap.once("error", async (error: any) => {
          logger.error(`IMAP connection failed for ${emailAccount.emailAddress}:`, error);

          // Update account status
          await EmailAccountModel.findByIdAndUpdate(emailAccount._id, {
            connectionStatus: "error",
            lastTestedAt: new Date(),
            "stats.lastErrorAt": new Date(),
            "stats.lastError": error.message,
          });

          resolve({
            success: false,
            message: "IMAP connection failed",
            error: error.message,
          });
        });

        imap.connect();
      } catch (error: any) {
        logger.error(`Error creating IMAP connection for ${emailAccount.emailAddress}:`, error);
        resolve({
          success: false,
          message: "Failed to create IMAP connection",
          error: error.message,
        });
      }
    });
  }

  // Test both connections
  static async testConnections(emailAccount: IEmailAccount): Promise<{
    smtp: EmailConnectionResult;
    imap: EmailConnectionResult;
  }> {
    const [smtpResult, imapResult] = await Promise.all([
      this.testSMTPConnection(emailAccount),
      this.testIMAPConnection(emailAccount),
    ]);

    return {
      smtp: smtpResult,
      imap: imapResult,
    };
  }

  // Sync emails from IMAP server
  static async syncEmails(
    emailAccount: IEmailAccount,
    folder: string = "INBOX",
    limit: number = 50
  ): Promise<EmailSyncResult> {
    return new Promise((resolve) => {
      try {
        const imap = this.createIMAPConnection(emailAccount);
        let emailCount = 0;
        const emails: any[] = [];

        imap.once("ready", () => {
          imap.openBox(folder, true, (err: any, box: any) => {
            if (err) {
              logger.error(`Error opening mailbox ${folder}:`, err);
              resolve({
                success: false,
                emailCount: 0,
                error: err.message,
              });
              return;
            }

            // Search for recent emails
            imap.search(["UNSEEN"], (err: any, results: any) => {
              if (err) {
                logger.error("Error searching emails:", err);
                resolve({
                  success: false,
                  emailCount: 0,
                  error: err.message,
                });
                return;
              }

              if (!results || results.length === 0) {
                logger.info("No new emails found");
                imap.end();
                resolve({
                  success: true,
                  emailCount: 0,
                  emails: [],
                });
                return;
              }

              // Limit results
              const limitedResults = results.slice(0, limit);

              const fetch = imap.fetch(limitedResults, {
                bodies: "HEADER.FIELDS (FROM TO SUBJECT DATE)",
                struct: true,
              });

              fetch.on("message", (msg: any, seqno: any) => {
                let headers: any = {};

                msg.on("body", (stream: any, info: any) => {
                  let buffer = "";
                  stream.on("data", (chunk: any) => {
                    buffer += chunk.toString("ascii");
                  });
                  stream.once("end", () => {
                    headers = Imap.parseHeader(buffer);
                  });
                });

                msg.once("end", () => {
                  emails.push({
                    seqno,
                    headers,
                    accountId: emailAccount._id,
                    folder,
                  });
                  emailCount++;
                });
              });

              fetch.once("error", (err: any) => {
                logger.error("Fetch error:", err);
                resolve({
                  success: false,
                  emailCount,
                  error: err.message,
                  emails,
                });
              });

              fetch.once("end", () => {
                logger.info(`Synced ${emailCount} emails from ${emailAccount.emailAddress}`);
                imap.end();

                // Update sync statistics
                EmailAccountModel.findByIdAndUpdate(emailAccount._id, {
                  "stats.lastSyncAt": new Date(),
                  "stats.totalEmails": emailCount,
                  status: "active",
                }).catch((err: any) => logger.error("Error updating sync stats:", err));

                resolve({
                  success: true,
                  emailCount,
                  emails,
                });
              });
            });
          });
        });

        imap.once("error", (err: any) => {
          logger.error(`IMAP sync error for ${emailAccount.emailAddress}:`, err);
          resolve({
            success: false,
            emailCount: 0,
            error: err.message,
          });
        });

        imap.connect();
      } catch (error: any) {
        logger.error(`Error syncing emails for ${emailAccount.emailAddress}:`, error);
        resolve({
          success: false,
          emailCount: 0,
          error: error.message,
        });
      }
    });
  }

  // Send email using account-specific configuration
  static async sendEmailWithAccount(
    emailAccount: IEmailAccount,
    emailData: {
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
      cc?: string | string[];
      bcc?: string | string[];
      attachments?: any[];
    }
  ): Promise<EmailConnectionResult> {
    try {
      const transporter = await this.createSMTPTransporter(emailAccount);

      const mailOptions = {
        from: `${emailAccount.displayName || emailAccount.accountName} <${emailAccount.emailAddress}>`,
        to: Array.isArray(emailData.to) ? emailData.to.join(", ") : emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        cc: emailData.cc ? (Array.isArray(emailData.cc) ? emailData.cc.join(", ") : emailData.cc) : undefined,
        bcc: emailData.bcc ? (Array.isArray(emailData.bcc) ? emailData.bcc.join(", ") : emailData.bcc) : undefined,
        attachments: emailData.attachments,
      };

      const result = await transporter.sendMail(mailOptions);

      logger.info(`Email sent successfully from ${emailAccount.emailAddress}`, {
        messageId: result.messageId,
        to: emailData.to,
        subject: emailData.subject,
      });

      return {
        success: true,
        message: "Email sent successfully",
        data: {
          messageId: result.messageId,
          response: result.response,
        },
      };
    } catch (error: any) {
      logger.error(`Error sending email from ${emailAccount.emailAddress}:`, error);
      return {
        success: false,
        message: "Failed to send email",
        error: error.message,
      };
    }
  }

  // Get predefined configurations for popular providers
  static getProviderPreset(provider: string): Partial<IEmailAccount> {
    const presets: Record<string, Partial<IEmailAccount>> = {
      gmail: {
        accountType: "gmail",
        incomingServer: {
          host: "imap.gmail.com",
          port: 993,
          security: "ssl",
          username: "",
          password: "",
        },
        outgoingServer: {
          host: "smtp.gmail.com",
          port: 587,
          security: "tls",
          username: "",
          password: "",
          requiresAuth: true,
        },
      },
      outlook: {
        accountType: "outlook",
        incomingServer: {
          host: "outlook.office365.com",
          port: 993,
          security: "ssl",
          username: "",
          password: "",
        },
        outgoingServer: {
          host: "smtp.office365.com",
          port: 587,
          security: "tls",
          username: "",
          password: "",
          requiresAuth: true,
        },
      },
      yahoo: {
        accountType: "imap",
        incomingServer: {
          host: "imap.mail.yahoo.com",
          port: 993,
          security: "ssl",
          username: "",
          password: "",
        },
        outgoingServer: {
          host: "smtp.mail.yahoo.com",
          port: 587,
          security: "tls",
          username: "",
          password: "",
          requiresAuth: true,
        },
      },
    };

    return presets[provider.toLowerCase()] || {};
  }

  // Validate email account configuration
  static validateEmailAccount(accountData: Partial<IEmailAccount>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!accountData.emailAddress) {
      errors.push("Email address is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountData.emailAddress)) {
      errors.push("Invalid email address format");
    }

    if (!accountData.accountName) {
      errors.push("Account name is required");
    }

    if (!accountData.accountType) {
      errors.push("Account type is required");
    }

    if (!accountData.incomingServer?.host) {
      errors.push("Incoming server host is required");
    }

    if (!accountData.incomingServer?.port) {
      errors.push("Incoming server port is required");
    }

    if (!accountData.outgoingServer?.host) {
      errors.push("Outgoing server host is required");
    }

    if (!accountData.outgoingServer?.port) {
      errors.push("Outgoing server port is required");
    }

    if (accountData.outgoingServer?.requiresAuth !== false) {
      if (!accountData.outgoingServer?.username) {
        errors.push("Outgoing server username is required");
      }
      if (!accountData.outgoingServer?.password) {
        errors.push("Outgoing server password is required");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const emailAccountConfigService = EmailAccountConfigService;
