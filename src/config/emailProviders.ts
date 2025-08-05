export interface EmailProviderConfig {
  name: string;
  type: "oauth" | "manual";
  incomingServer: {
    host: string;
    port: number;
    security: "ssl" | "tls" | "starttls" | "none";
  };
  outgoingServer: {
    host: string;
    port: number;
    security: "ssl" | "tls" | "starttls" | "none";
    requiresAuth: boolean;
  };
  defaultSyncFolders?: string[];
  note?: string;
  oauth?: {
    provider: "gmail" | "outlook" | "yahoo";
    scopes: string[];
    authUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
  };
}

export interface EmailAccountDefaults {
  accountType: "gmail" | "outlook" | "imap" | "pop3" | "exchange" | "custom";
  incomingServer: {
    host: string;
    port: number;
    security: "ssl" | "tls" | "starttls" | "none";
  };
  outgoingServer: {
    host: string;
    port: number;
    security: "ssl" | "tls" | "starttls" | "none";
    requiresAuth: boolean;
  };
  settings?: {
    syncFolders: string[];
  };
  note?: string;
}

// Common email provider configurations with hardcoded defaults
export const COMMON_EMAIL_PROVIDERS: Record<string, EmailProviderConfig> = {
  // OAuth Providers
  gmail: {
    name: "Gmail",
    type: "oauth",
    incomingServer: {
      host: "imap.gmail.com",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "smtp.gmail.com",
      port: 587,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent", "Drafts", "Trash"],
    oauth: {
      provider: "gmail",
      scopes: [
        "https://mail.google.com/",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
      ],
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },

  outlook: {
    name: "Outlook",
    type: "oauth",
    incomingServer: {
      host: "outlook.office365.com",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "smtp.office365.com",
      port: 587,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent Items", "Drafts", "Deleted Items"],
    oauth: {
      provider: "outlook",
      scopes: [
        "https://outlook.office.com/IMAP.AccessAsUser.All",
        "https://outlook.office.com/SMTP.Send",
        "offline_access",
      ],
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      clientId: process.env.OUTLOOK_CLIENT_ID || "",
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET || "",
    },
  },

  // Manual Providers with Domain Detection
  "yahoo.com": {
    name: "Yahoo Mail",
    type: "manual",
    incomingServer: {
      host: "imap.mail.yahoo.com",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "smtp.mail.yahoo.com",
      port: 465,
      security: "ssl",
      requiresAuth: true,
    },
    defaultSyncFolders: ["Inbox", "Sent", "Draft", "Trash"],
  },

  "hotmail.com": {
    name: "Hotmail",
    type: "manual",
    incomingServer: {
      host: "outlook.office365.com",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "smtp-mail.outlook.com",
      port: 587,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent Items", "Drafts", "Deleted Items"],
  },

  "live.com": {
    name: "Live Mail",
    type: "manual",
    incomingServer: {
      host: "outlook.office365.com",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "smtp-mail.outlook.com",
      port: 587,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent Items", "Drafts", "Deleted Items"],
  },

  "outlook.com": {
    name: "Outlook.com",
    type: "manual",
    incomingServer: {
      host: "outlook.office365.com",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "smtp-mail.outlook.com",
      port: 587,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent Items", "Drafts", "Deleted Items"],
  },

  "icloud.com": {
    name: "iCloud Mail",
    type: "manual",
    incomingServer: {
      host: "imap.mail.me.com",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "smtp.mail.me.com",
      port: 587,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent", "Drafts", "Trash"],
  },

  "me.com": {
    name: "iCloud Mail",
    type: "manual",
    incomingServer: {
      host: "imap.mail.me.com",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "smtp.mail.me.com",
      port: 587,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent", "Drafts", "Trash"],
  },

  "mac.com": {
    name: "iCloud Mail",
    type: "manual",
    incomingServer: {
      host: "imap.mail.me.com",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "smtp.mail.me.com",
      port: 587,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent", "Drafts", "Trash"],
  },

  "aol.com": {
    name: "AOL Mail",
    type: "manual",
    incomingServer: {
      host: "imap.aol.com",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "smtp.aol.com",
      port: 587,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent", "Drafts", "Trash"],
  },

  "protonmail.com": {
    name: "ProtonMail",
    type: "manual",
    incomingServer: {
      host: "127.0.0.1",
      port: 1143,
      security: "ssl",
    },
    outgoingServer: {
      host: "127.0.0.1",
      port: 1025,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent", "Drafts", "Trash"],
    note: "ProtonMail requires Bridge application for IMAP/SMTP access",
  },

  "tutanota.com": {
    name: "Tutanota",
    type: "manual",
    incomingServer: {
      host: "imap.tutanota.com",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "smtp.tutanota.com",
      port: 587,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent", "Drafts", "Trash"],
  },

  // Generic defaults for unknown domains
  custom: {
    name: "Custom IMAP/SMTP",
    type: "manual",
    incomingServer: {
      host: "",
      port: 993,
      security: "ssl",
    },
    outgoingServer: {
      host: "",
      port: 587,
      security: "tls",
      requiresAuth: true,
    },
    defaultSyncFolders: ["INBOX", "Sent", "Drafts", "Trash"],
  },
};

// Legacy EMAIL_PROVIDERS for backward compatibility
export const EMAIL_PROVIDERS = COMMON_EMAIL_PROVIDERS;

export class EmailProviderService {
  static getProvider(providerName: string): EmailProviderConfig | null {
    return COMMON_EMAIL_PROVIDERS[providerName.toLowerCase()] || null;
  }

  static getAllProviders(): EmailProviderConfig[] {
    return Object.values(COMMON_EMAIL_PROVIDERS);
  }

  static getOAuthProviders(): EmailProviderConfig[] {
    return Object.values(COMMON_EMAIL_PROVIDERS).filter((provider) => provider.type === "oauth");
  }

  static getManualProviders(): EmailProviderConfig[] {
    return Object.values(COMMON_EMAIL_PROVIDERS).filter((provider) => provider.type === "manual");
  }

  static validateProvider(providerName: string): boolean {
    return providerName.toLowerCase() in COMMON_EMAIL_PROVIDERS;
  }

  // New method to detect provider from email address
  static detectProviderFromEmail(emailAddress: string): EmailProviderConfig | null {
    const domain = emailAddress.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    // Check for exact domain match
    if (COMMON_EMAIL_PROVIDERS[domain]) {
      return COMMON_EMAIL_PROVIDERS[domain];
    }

    // Check for partial domain matches (e.g., *.gmail.com)
    for (const [key, config] of Object.entries(COMMON_EMAIL_PROVIDERS)) {
      if (key.includes('*') && domain.endsWith(key.replace('*', ''))) {
        return config;
      }
    }

    return null;
  }

  // Get default configuration for an email address
  static getDefaultConfigForEmail(emailAddress: string): EmailAccountDefaults {
    const detected = this.detectProviderFromEmail(emailAddress);
    if (detected) {
      return {
        accountType: detected.type === 'oauth' ? 'gmail' : 'imap',
        incomingServer: detected.incomingServer,
        outgoingServer: detected.outgoingServer,
        settings: {
          syncFolders: detected.defaultSyncFolders || ["INBOX"],
        },
        note: detected.note,
      };
    }

    // Return generic defaults for unknown domains
    return {
      accountType: 'imap',
      incomingServer: {
        host: '',
        port: 993,
        security: 'ssl',
      },
      outgoingServer: {
        host: '',
        port: 587,
        security: 'tls',
        requiresAuth: true,
      },
      settings: {
        syncFolders: ["INBOX"],
      },
    };
  }
}
