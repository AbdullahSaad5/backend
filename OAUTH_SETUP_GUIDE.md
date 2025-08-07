# OAuth Setup Guide

This guide explains how to set up OAuth authentication for Google Gmail and Microsoft Outlook email integration.

## Prerequisites

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your actual values.

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (unless you're using Google Workspace)
3. Fill in required information:
   - App name: "BAVIT Email Integration"
   - User support email: your email
   - Developer contact information: your email
4. Add scopes:
   - `https://mail.google.com/`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

### Step 3: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Set authorized redirect URIs:
   - `http://localhost:5000/api/email-accounts/oauth/google/callback` (for development)
   - `https://yourdomain.com/api/email-accounts/oauth/google/callback` (for production)
5. Copy the Client ID and Client Secret to your `.env` file:
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

## Microsoft Outlook OAuth Setup

### Step 1: Register App in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Fill in:
   - Name: "BAVIT Email Integration"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: 
     - Type: Web
     - URL: `http://localhost:5000/api/email-accounts/oauth/outlook/callback`

### Step 2: Configure API Permissions

1. In your app registration, go to "API permissions"
2. Click "Add a permission" > "Microsoft Graph"
3. Choose "Delegated permissions"
4. Add these permissions:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `IMAP.AccessAsUser.All`
   - `SMTP.Send`
   - `User.Read`
   - `offline_access`
5. Click "Grant admin consent" if you're an admin

### Step 3: Create Client Secret

1. Go to "Certificates & secrets" > "Client secrets"
2. Click "New client secret"
3. Add description and choose expiry
4. Copy the secret value immediately to your `.env` file:
   ```env
   OUTLOOK_CLIENT_ID=your_application_id_here
   OUTLOOK_CLIENT_SECRET=your_client_secret_here
   ```

## Environment Configuration

Update your `.env` file with the following OAuth-related variables:

```env
# OAuth Configuration
OAUTH_REDIRECT_URI=http://localhost:5000/api/email-accounts/oauth
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Outlook OAuth
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret

# Frontend URL for redirects after OAuth
FRONTEND_URL=http://localhost:3000
```

## Testing OAuth Flow

1. Start your backend server:
   ```bash
   npm run dev
   ```

2. The OAuth flow works as follows:
   - Frontend calls `/api/email-accounts/oauth/google` to get OAuth URL
   - User is redirected to Google/Microsoft for authentication
   - After successful authentication, user is redirected to callback URL
   - Callback processes the authorization code and creates/updates email account
   - User is redirected back to frontend with success/error status

## Troubleshooting

### Common Issues

1. **"OAuth credentials not configured" error**
   - Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
   - Restart your server after updating environment variables

2. **"Request is missing required authentication credential" error**
   - Check OAuth scopes in Google Cloud Console
   - Ensure Gmail API is enabled
   - Verify redirect URI matches exactly

3. **"Unauthorized" callback errors**
   - This should now be fixed after removing auth guard from callback routes
   - Verify callback URLs are accessible without authentication

4. **Token refresh issues**
   - Ensure `offline_access` scope is included for Outlook
   - Use `access_type: "offline"` and `prompt: "consent"` for Google

### Debug Tips

1. Check server logs for detailed error messages
2. Verify environment variables are loaded:
   ```bash
   console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID);
   ```
3. Test OAuth URLs manually in browser
4. Use network tab to inspect OAuth callback requests

## Production Deployment

1. Update redirect URIs in OAuth providers to use your production domain
2. Update `OAUTH_REDIRECT_URI` and `FRONTEND_URL` in production environment
3. Use secure HTTPS URLs for all OAuth redirects
4. Generate strong encryption keys for production
5. Consider using environment variable management service
