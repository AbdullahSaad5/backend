# Multi-Account Mailbox Management System

## Overview

The enhanced mailbox system now supports multiple email accounts management for admins, similar to real email clients like Gmail, Outlook, or Apple Mail. This allows administrators to manage multiple email accounts from a single unified interface.

## Features

### 1. Email Account Management
- **Add Multiple Accounts**: Admins can add multiple email accounts (Gmail, Outlook, IMAP, POP3, Exchange)
- **Account Configuration**: Support for IMAP, POP3, Exchange, and OAuth providers
- **Unified Inbox**: View all emails from multiple accounts in one place
- **Account-specific Folders**: Separate folders per account (Inbox, Sent, Drafts, etc.)
- **Real-time Sync**: Automatic synchronization with external email servers

### 2. Supported Account Types
- **IMAP**: Full two-way synchronization
- **POP3**: Download emails to local storage
- **Exchange**: Microsoft Exchange server support
- **Gmail**: OAuth integration with Gmail API
- **Outlook**: OAuth integration with Outlook API
- **Custom**: Custom SMTP/IMAP configurations

## API Endpoints

### Account Management

#### Create Email Account
```http
POST /api/mailbox/admin/email-accounts
```

**Request Body:**
```json
{
  "userId": "admin_user_id",
  "accountName": "My Gmail Account",
  "emailAddress": "admin@gmail.com",
  "displayName": "Admin User",
  "accountType": "gmail",
  "isActive": true,
  "isPrimary": false,
  "incomingServer": {
    "host": "imap.gmail.com",
    "port": 993,
    "security": "ssl",
    "username": "admin@gmail.com",
    "password": "encrypted_password"
  },
  "outgoingServer": {
    "host": "smtp.gmail.com",
    "port": 587,
    "security": "tls",
    "username": "admin@gmail.com",
    "password": "encrypted_password",
    "requiresAuth": true
  },
  "oauth": {
    "provider": "gmail",
    "clientId": "gmail_client_id",
    "clientSecret": "gmail_client_secret",
    "refreshToken": "refresh_token",
    "accessToken": "access_token",
    "tokenExpiry": "2024-12-31T23:59:59Z"
  },
  "settings": {
    "checkInterval": 15,
    "autoDownload": true,
    "downloadLimit": 100,
    "deleteFromServer": false,
    "leaveOnServer": true,
    "syncFolders": ["INBOX", "Sent", "Drafts"]
  }
}
```

#### Get All Email Accounts
```http
GET /api/mailbox/admin/email-accounts
```

#### Get Email Account by ID
```http
GET /api/mailbox/admin/email-accounts/:id
```

#### Update Email Account
```http
PATCH /api/mailbox/admin/email-accounts/:id
```

#### Delete Email Account
```http
DELETE /api/mailbox/admin/email-accounts/:id
```

### Enhanced Email Operations

#### Get Unified Inbox
```http
GET /api/mailbox/emails?accountId=all&page=1&limit=20
```

#### Get Account-specific Emails
```http
GET /api/mailbox/emails?accountId=account_id&folder=INBOX
```

#### Send Email from Specific Account
```http
POST /api/mailbox/send
```

**Request Body:**
```json
{
  "accountId": "account_id",
  "to": ["recipient@example.com"],
  "subject": "Subject",
  "body": "Email body",
  "html": "<p>HTML email body</p>",
  "from": "sender@gmail.com"
}
```

## Database Schema

### EmailAccount Model
```typescript
interface IEmailAccount {
  _id: string;
  userId: string; // Admin/User who owns this account
  accountName: string;
  emailAddress: string;
  displayName?: string;
  
  accountType: "imap" | "pop3" | "exchange" | "gmail" | "outlook" | "custom";
  isActive: boolean;
  isPrimary: boolean;
  
  incomingServer: {
    host: string;
    port: number;
    security: "none" | "ssl" | "tls" | "starttls";
    username: string;
    password: string;
  };
  
  outgoingServer: {
    host: string;
    port: number;
    security: "none" | "ssl" | "tls" | "starttls";
    username: string;
    password: string;
    requiresAuth: boolean;
  };
  
  oauth?: {
    provider: "gmail" | "outlook" | "yahoo";
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    accessToken?: string;
    tokenExpiry?: Date;
  };
  
  settings: {
    checkInterval: number;
    autoDownload: boolean;
    downloadLimit: number;
    deleteFromServer: boolean;
    leaveOnServer: boolean;
    syncFolders: string[];
  };
  
  stats: {
    totalEmails: number;
    unreadEmails: number;
    lastSyncAt?: Date;
    lastErrorAt?: Date;
    lastError?: string;
  };
  
  status: "active" | "inactive" | "error" | "syncing";
  connectionStatus: "connected" | "disconnected" | "error";
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Enhanced Email Model
The existing email model has been updated to include:
```typescript
interface IEmail {
  // ... existing fields
  accountId: ObjectId; // Reference to EmailAccount
  // ... rest of fields
}
```

## Configuration Examples

### Gmail Configuration
```json
{
  "accountType": "gmail",
  "incomingServer": {
    "host": "imap.gmail.com",
    "port": 993,
    "security": "ssl"
  },
  "outgoingServer": {
    "host": "smtp.gmail.com",
    "port": 587,
    "security": "tls"
  },
  "oauth": {
    "provider": "gmail",
    "clientId": "your_gmail_client_id",
    "clientSecret": "your_gmail_client_secret"
  }
}
```

### Outlook Configuration
```json
{
  "accountType": "outlook",
  "incomingServer": {
    "host": "outlook.office365.com",
    "port": 993,
    "security": "ssl"
  },
  "outgoingServer": {
    "host": "smtp.office365.com",
    "port": 587,
    "security": "tls"
  }
}
```

### Custom IMAP Configuration
```json
{
  "accountType": "imap",
  "incomingServer": {
    "host": "mail.yourcompany.com",
    "port": 993,
    "security": "ssl"
  },
  "outgoingServer": {
    "host": "smtp.yourcompany.com",
    "port": 587,
    "security": "tls"
  }
}
```

## Security Features

1. **Password Encryption**: All passwords are encrypted before storage
2. **OAuth Support**: Secure authentication for Gmail, Outlook, and Yahoo
3. **Token Management**: Automatic token refresh for OAuth providers
4. **Access Control**: Only authorized admins can manage accounts
5. **Audit Logging**: All account operations are logged

## Real-time Features

1. **Live Sync**: Real-time synchronization with email servers
2. **WebSocket Notifications**: Instant notifications for new emails
3. **Status Updates**: Real-time account status and connection updates
4. **Error Notifications**: Immediate alerts for connection issues

## Usage Examples

### Adding a Gmail Account
```javascript
const response = await fetch('/api/mailbox/admin/email-accounts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  body: JSON.stringify({
    userId: 'admin_id',
    accountName: 'My Gmail',
    emailAddress: 'admin@gmail.com',
    accountType: 'gmail',
    // ... other configuration
  })
});
```

### Getting Unified Inbox
```javascript
const emails = await fetch('/api/mailbox/emails?accountId=all&page=1&limit=50');
```

### Sending Email from Specific Account
```javascript
const result = await fetch('/api/mailbox/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  body: JSON.stringify({
    accountId: 'gmail_account_id',
    to: ['client@example.com'],
    subject: 'Project Update',
    body: 'Email content here'
  })
});
```

## Benefits

1. **Centralized Management**: Manage all email accounts from one place
2. **Improved Productivity**: Unified inbox reduces context switching
3. **Better Organization**: Account-specific folders and labels
4. **Enhanced Security**: Centralized security policies and monitoring
5. **Scalability**: Easy to add new accounts and manage at scale
6. **Real-time Sync**: Always up-to-date across all devices and clients

This enhanced mailbox system provides enterprise-grade email management capabilities while maintaining the simplicity and user experience of consumer email clients.
