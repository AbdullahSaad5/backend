# Email Provider Detection System

This document describes the automatic email provider detection system that minimizes user input by using hardcoded configurations for common email providers.

## Overview

The system automatically detects email provider settings based on the email domain, reducing the configuration burden on users. It supports both OAuth and manual authentication methods.

## Supported Providers

### OAuth Providers (Automatic Setup)

- **Gmail** (`gmail.com`) - Uses Google OAuth
- **Outlook** (`outlook.com`) - Uses Microsoft OAuth

### Manual Providers (Auto-Configured)

- **Yahoo Mail** (`yahoo.com`)
- **Hotmail** (`hotmail.com`)
- **Live Mail** (`live.com`)
- **Outlook.com** (`outlook.com`)
- **iCloud Mail** (`icloud.com`, `me.com`, `mac.com`)
- **AOL Mail** (`aol.com`)
- **ProtonMail** (`protonmail.com`) - Requires Bridge
- **Tutanota** (`tutanota.com`)

## API Endpoints

### Detect Provider Configuration

```http
POST /api/email-account/detect-provider
Content-Type: application/json
Authorization: Bearer <token>

{
  "emailAddress": "user@yahoo.com"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "emailAddress": "user@yahoo.com",
    "detectedProvider": {
      "name": "Yahoo Mail",
      "type": "manual",
      "note": null
    },
    "defaultConfig": {
      "accountType": "imap",
      "incomingServer": {
        "host": "imap.mail.yahoo.com",
        "port": 993,
        "security": "ssl"
      },
      "outgoingServer": {
        "host": "smtp.mail.yahoo.com",
        "port": 465,
        "security": "ssl",
        "requiresAuth": true
      },
      "settings": {
        "syncFolders": ["Inbox", "Sent", "Draft", "Trash"]
      }
    },
    "isOAuthSupported": false
  }
}
```

## Frontend Integration

### Step 1: Email Input with Auto-Detection

```jsx
const [emailAddress, setEmailAddress] = useState("");
const [detectedProvider, setDetectedProvider] = useState(null);
const [isDetecting, setIsDetecting] = useState(false);

const detectProvider = async (email) => {
  if (!email || !email.includes("@")) return;

  setIsDetecting(true);
  try {
    const response = await fetch("/api/email-account/detect-provider", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ emailAddress: email }),
    });

    const data = await response.json();
    if (data.success) {
      setDetectedProvider(data.data);

      // Auto-fill form with detected settings
      if (data.data.defaultConfig) {
        setFormData((prev) => ({
          ...prev,
          accountType: data.data.defaultConfig.accountType,
          incomingServer: {
            ...data.data.defaultConfig.incomingServer,
            username: email,
          },
          outgoingServer: {
            ...data.data.defaultConfig.outgoingServer,
            username: email,
          },
          settings: data.data.defaultConfig.settings,
        }));
      }
    }
  } catch (error) {
    console.error("Error detecting provider:", error);
  } finally {
    setIsDetecting(false);
  }
};
```

### Step 2: Conditional UI Based on Detection

```jsx
const renderProviderOptions = () => {
  if (!detectedProvider) {
    return (
      <div className="provider-selection">
        <h3>Choose your email provider:</h3>
        <button onClick={() => handleProviderSelect("gmail")}>Gmail (OAuth)</button>
        <button onClick={() => handleProviderSelect("outlook")}>Outlook (OAuth)</button>
        <button onClick={() => setShowManualForm(true)}>Other Provider</button>
      </div>
    );
  }

  if (detectedProvider.isOAuthSupported) {
    return (
      <div className="oauth-option">
        <h3>Detected: {detectedProvider.detectedProvider.name}</h3>
        <p>We can set up your account automatically using OAuth.</p>
        <button onClick={() => handleOAuthSetup()}>Connect with {detectedProvider.detectedProvider.name}</button>
        <button onClick={() => setShowManualForm(true)}>Use manual setup instead</button>
      </div>
    );
  }

  return (
    <div className="manual-option">
      <h3>Detected: {detectedProvider.detectedProvider.name}</h3>
      <p>We'll configure your account with the recommended settings.</p>
      <button onClick={() => setShowManualForm(true)}>Continue with manual setup</button>
    </div>
  );
};
```

## User Experience Flow

### For OAuth Providers (Gmail/Outlook)

1. User enters email address
2. System detects OAuth support
3. User clicks "Connect with [Provider]"
4. Redirected to OAuth flow
5. Account automatically configured

### For Manual Providers (Yahoo, iCloud, etc.)

1. User enters email address
2. System detects provider and auto-fills settings
3. User only needs to enter:
   - Account name
   - Password
   - Primary account setting
4. Account configured with pre-filled server settings

### For Unknown Providers

1. User enters email address
2. System shows generic IMAP/SMTP form
3. User fills in server details manually
4. Account configured with custom settings

## Configuration Details

### Gmail Configuration

```javascript
{
  name: "Gmail",
  type: "oauth",
  incomingServer: {
    host: "imap.gmail.com",
    port: 993,
    security: "ssl"
  },
  outgoingServer: {
    host: "smtp.gmail.com",
    port: 587,
    security: "tls",
    requiresAuth: true
  },
  defaultSyncFolders: ["INBOX", "Sent", "Drafts", "Trash"]
}
```

### Yahoo Configuration

```javascript
{
  name: "Yahoo Mail",
  type: "manual",
  incomingServer: {
    host: "imap.mail.yahoo.com",
    port: 993,
    security: "ssl"
  },
  outgoingServer: {
    host: "smtp.mail.yahoo.com",
    port: 465,
    security: "ssl",
    requiresAuth: true
  },
  defaultSyncFolders: ["Inbox", "Sent", "Draft", "Trash"]
}
```

## Special Cases

### ProtonMail

ProtonMail requires the Bridge application for IMAP/SMTP access:

```javascript
{
  name: "ProtonMail",
  type: "manual",
  incomingServer: {
    host: "127.0.0.1", // Bridge local proxy
    port: 1143,
    security: "ssl"
  },
  outgoingServer: {
    host: "127.0.0.1", // Bridge local proxy
    port: 1025,
    security: "tls",
    requiresAuth: true
  },
  note: "ProtonMail requires Bridge application for IMAP/SMTP access"
}
```

### iCloud Mail

iCloud Mail supports multiple domains:

```javascript
{
  name: "iCloud Mail",
  type: "manual",
  incomingServer: {
    host: "imap.mail.me.com",
    port: 993,
    security: "ssl"
  },
  outgoingServer: {
    host: "smtp.mail.me.com",
    port: 587,
    security: "tls",
    requiresAuth: true
  },
  defaultSyncFolders: ["INBOX", "Sent", "Drafts", "Trash"]
}
```

## Benefits

1. **Minimal User Input**: Users only need to provide email address and password
2. **Automatic Configuration**: Server settings are pre-filled based on provider
3. **Reduced Errors**: No manual server configuration required
4. **Better UX**: Clear provider detection and appropriate setup flow
5. **Extensible**: Easy to add new providers to the configuration

## Adding New Providers

To add a new email provider:

1. Add configuration to `COMMON_EMAIL_PROVIDERS` in `src/config/emailProviders.ts`
2. Include server settings, default folders, and any special notes
3. Test with the provider's IMAP/SMTP servers
4. Update documentation if needed

Example:

```javascript
"newprovider.com": {
  name: "New Provider",
  type: "manual",
  incomingServer: {
    host: "imap.newprovider.com",
    port: 993,
    security: "ssl"
  },
  outgoingServer: {
    host: "smtp.newprovider.com",
    port: 587,
    security: "tls",
    requiresAuth: true
  },
  defaultSyncFolders: ["INBOX", "Sent", "Drafts", "Trash"]
}
```
