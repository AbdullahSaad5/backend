import nodemailer from "nodemailer";
import { EmailAccountModel, IEmailAccount } from "@/models/email-account.model";
import Imap from "imap";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";

export const emailConnectionService = {
  async createTransporter(emailAccount: IEmailAccount) {
    const { accountType, outgoingServer, oauth } = emailAccount;

    if (oauth?.provider === "gmail") {
      const oAuth2Client = new OAuth2Client(oauth.clientId, oauth.clientSecret);
      oAuth2Client.setCredentials({ refresh_token: oauth.refreshToken });

      const accessToken = await oAuth2Client.getAccessToken();

      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: emailAccount.emailAddress,
          clientId: oauth.clientId,
          clientSecret: oauth.clientSecret,
          refreshToken: oauth.refreshToken,
          accessToken: accessToken.token,
        },
      } as any);
    }

    // Other configurations like SMTP/POP3
    return nodemailer.createTransport({
      host: outgoingServer.host,
      port: outgoingServer.port,
      secure: outgoingServer.security === "ssl" || outgoingServer.port === 465,
      auth: {
        user: outgoingServer.username,
        pass: this.decryptPassword(outgoingServer.password),
      },
    });
  },

  async testConnection(emailAccount: IEmailAccount) {
    const transporter = await this.createTransporter(emailAccount);
    try {
      await transporter.verify();
      console.log("Connection successful");
    } catch (error) {
      console.error("Connection failed:", error);
    }
  },

  async fetchEmails(emailAccount: IEmailAccount) {
    const { incomingServer } = emailAccount;
    const imap = new Imap({
      user: incomingServer.username,
      password: this.decryptPassword(incomingServer.password),
      host: incomingServer.host,
      port: incomingServer.port,
      tls: incomingServer.security === "ssl",
      tlsOptions: { rejectUnauthorized: false },
    });

    return new Promise((resolve, reject) => {
      imap.once("ready", () => {
        imap.openBox("INBOX", true, (err: any, box: any) => {
          if (err) {
            console.error("Error opening mailbox:", err);
            reject(err);
            return;
          }
          console.log("Mailbox opened:", box);
          imap.end();
          resolve(box);
        });
      });

      imap.once("error", (err: any) => {
        console.error("IMAP error:", err);
        reject(err);
      });

      imap.connect();
    });
  },

  encryptPassword(plainText: string): string {
    // Implement encryption logic here
    const cipher = crypto.createCipheriv(
      "aes-256-ctr",
      process.env.ENCRYPTION_KEY || "default_key",
      Buffer.alloc(16, 0)
    );
    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  },

  decryptPassword(cipherText: string): string {
    // Implement decryption logic here
    const decipher = crypto.createDecipheriv(
      "aes-256-ctr",
      process.env.ENCRYPTION_KEY || "default_key",
      Buffer.alloc(16, 0)
    );
    let decrypted = decipher.update(cipherText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  },
};
