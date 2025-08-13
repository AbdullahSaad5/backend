# Email Account OAuth Setup

This document describes the OAuth-based email account configuration system for Gmail and Outlook integration.

## Overview

The system now supports OAuth 2.0 authentication for email providers, eliminating the need for app passwords and providing better security. Currently supported providers:

- **Gmail** (Google Workspace)
- **Outlook** (Microsoft 365)
- **Manual IMAP/SMTP** (for custom email servers)

## API Endpoints

### OAuth Endpoints

#### Google OAuth

- `POST /api/email-account/oauth/google` - Initiate Google OAuth flow
- `GET /api/email-account/oauth/google/callback` - Handle Google OAuth callback

#### Outlook OAuth

- `POST /api/email-account/oauth/outlook` - Initiate Outlook OAuth flow
- `GET /api/email-account/oauth/outlook/callback` - Handle Outlook OAuth callback

### Manual Account Management

- `POST /api/email-account/manual` - Create manual IMAP/SMTP account
- `GET /api/email-account/accounts` - Get user's email accounts
- `GET /api/email-account/accounts/:accountId/test` - Test account connection
- `PUT /api/email-account/accounts/:accountId` - Update account settings
- `DELETE /api/email-account/accounts/:accountId` - Delete account
- `POST /api/email-account/accounts/:accountId/refresh-tokens` - Refresh OAuth tokens

### Provider Information

- `GET /api/email-account/providers` - Get all available email providers
- `GET /api/email-account/providers/oauth` - Get OAuth-enabled providers only

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
YAHOO_CLIENT_ID=your_yahoo_client_id
YAHOO_CLIENT_SECRET=your_yahoo_client_secret

# OAuth Redirect URLs
OAUTH_REDIRECT_URI=http://localhost:3000/api/email-accounts/oauth
FRONTEND_URL=http://localhost:3000

# Encryption (for sensitive data)
ENCRYPTION_KEY=your_secure_encryption_key
```

## OAuth Provider Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Gmail API v1
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen
6. Set application type to "Web application"
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/email-accounts/oauth/google/callback` (development)
   - `https://yourdomain.com/api/email-accounts/oauth/google/callback` (production)
8. Copy Client ID and Client Secret to environment variables

### Outlook OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application in Azure Active Directory
3. Set application type to "Web"
4. Add redirect URIs:
   - `http://localhost:3000/api/email-accounts/oauth/outlook/callback` (development)
   - `https://yourdomain.com/api/email-accounts/oauth/outlook/callback` (production)
5. Grant API permissions:
   - Microsoft Graph → IMAP.AccessAsUser.All
   - Microsoft Graph → SMTP.Send
   - Microsoft Graph → offline_access
6. Copy Application (client) ID and create a client secret
7. Add to environment variables

## Usage Examples

### Frontend Integration

#### 1. Initiate Google OAuth

```javascript
const initiateGoogleOAuth = async (emailAddress, accountName) => {
  const response = await fetch("/api/email-account/oauth/google", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      emailAddress,
      accountName,
      userId: currentUser.id,
    }),
  });

  const data = await response.json();
  if (data.success) {
    // Redirect user to OAuth URL
    window.location.href = data.data.oauthUrl;
  }
};
```

#### 2. Handle OAuth Callback

The OAuth callback will redirect to your frontend with success/error parameters:

```javascript
// Success URL: /email-accounts/success?provider=gmail&email=user@gmail.com
// Error URL: /email-accounts/error?provider=gmail&error=access_denied

const urlParams = new URLSearchParams(window.location.search);
const provider = urlParams.get("provider");
const email = urlParams.get("email");
const error = urlParams.get("error");

if (error) {
  console.error("OAuth error:", error);
  // Handle error
} else {
  console.log("OAuth success:", { provider, email });
  // Handle success
}
```

#### 3. Create Manual Account

```javascript
const createManualAccount = async (accountData) => {
  const response = await fetch("/api/email-account/manual", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...accountData,
      userId: currentUser.id,
    }),
  });

  return await response.json();
};
```

#### 4. Get User Accounts

```javascript
const getUserAccounts = async () => {
  const response = await fetch("/api/email-account/accounts", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
};
```

## Account Types

### OAuth Accounts (Gmail/Outlook)

- Automatically configured with OAuth tokens
- No password storage required
- Automatic token refresh
- Enhanced security

### Manual Accounts (IMAP/SMTP)

- Traditional username/password authentication
- Encrypted password storage
- Supports custom email servers
- Full control over server settings

## Security Features

1. **Encrypted Storage**: All sensitive data (passwords, tokens) are encrypted
2. **OAuth State Validation**: Prevents CSRF attacks
3. **Token Refresh**: Automatic token renewal for OAuth accounts
4. **User Isolation**: Users can only access their own accounts
5. **Input Validation**: Comprehensive request validation

## Error Handling

The system provides detailed error messages for common issues:

- Invalid OAuth state
- Token exchange failures
- Network connectivity issues
- Invalid account configuration
- Authentication failures

## Testing

### Test OAuth Flow

1. Start the development server
2. Navigate to your frontend
3. Initiate OAuth for Gmail or Outlook
4. Complete the OAuth flow
5. Verify account creation in database

### Test Manual Account

1. Use the manual account creation endpoint
2. Provide valid IMAP/SMTP settings
3. Test connection using the test endpoint
4. Verify email sending/receiving

## Troubleshooting

### Common Issues

1. **OAuth Redirect URI Mismatch**
   - Ensure redirect URIs match exactly in provider settings
   - Check environment variables

2. **Token Refresh Failures**
   - Verify client credentials
   - Check token expiry settings

3. **Connection Test Failures**
   - Verify server settings
   - Check firewall/network restrictions
   - Ensure proper authentication

4. **Encryption Errors**
   - Verify ENCRYPTION_KEY environment variable
   - Check for special characters in keys

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
LOG_LEVEL=debug
```

## Migration from Legacy System

If migrating from a password-based system:

1. Export existing account data
2. Create new OAuth accounts for supported providers
3. Update frontend to use new OAuth flow
4. Test all email functionality
5. Remove legacy password fields

## Support

For issues or questions:

- Check the logs for detailed error messages
- Verify environment variable configuration
- Test with a simple OAuth flow first
- Ensure all required APIs are enabled in provider consoles
