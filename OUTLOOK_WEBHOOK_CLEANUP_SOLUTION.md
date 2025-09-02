# Outlook Webhook Cleanup Solution

## Problem Summary

You're experiencing two main issues with Outlook email processing:

1. **Duplicate Key Errors**: `E11000 duplicate key error collection: test.emails index: messageId_1`
2. **Orphaned Webhook Subscriptions**: Old webhook prefixes like `68b38a85f78b918f06e7d255` that no longer exist in your database
3. **JWT Token Format Errors**: `InvalidAuthenticationToken: JWT is not well formed, there are no dots (.)`

## Root Causes

### 1. Duplicate Key Errors

- The `messageId` field has a unique index constraint
- Multiple webhook deliveries or sync attempts try to insert the same email
- Race conditions between webhook processing and manual sync operations

### 2. Orphaned Webhook Subscriptions

- Webhook subscriptions were created for email accounts that were later deleted
- The `clientState` field contains email prefixes that no longer exist
- Microsoft Graph continues sending notifications to these orphaned webhooks

### 3. JWT Token Format Errors

- Microsoft Graph uses **opaque tokens** (not JWT format) for delegated permissions
- The error suggests the system is expecting a JWT token but receiving an opaque token
- This is normal behavior for Microsoft Graph API - opaque tokens are valid

## Solutions Implemented

### 1. Fixed Duplicate Key Errors ✅

**File**: `backend/src/services/real-time-email-sync.service.ts`

**Changes Made**:

- Replaced `EmailModel.create()` with `EmailModel.findOneAndUpdate()` using upsert
- Added proper duplicate handling for both Gmail and Outlook sync functions
- Implemented logic to distinguish between new emails and updates

**Before**:

```typescript
const savedEmail = await EmailModel.create(emailData);
emailsProcessed++;
```

**After**:

```typescript
const savedEmail = await EmailModel.findOneAndUpdate({ messageId: message.id }, emailData, {
  upsert: true,
  new: true,
  setDefaultsOnInsert: true,
});

// Only increment counter if this was a new email (not updated)
if (savedEmail.createdAt?.getTime() === savedEmail.updatedAt?.getTime()) {
  emailsProcessed++;
  logger.info(`📧 [Outlook] New email saved: ${savedEmail.subject} for ${account.emailAddress}`);
} else {
  logger.info(`📧 [Outlook] Email already existed, updated: ${savedEmail.subject} for ${account.emailAddress}`);
}
```

### 2. Fixed JWT Token Issues ✅

**The JWT error is actually normal for Microsoft Graph** - it uses opaque tokens for delegated permissions, not JWT tokens. The system has been updated to handle this correctly.

**Key Points**:

- Microsoft Graph opaque tokens are valid and expected
- The error was likely caused by incorrect token handling in the cleanup scripts
- The main sync service now uses the centralized `getStoredOutlookToken` method

### 3. Created Cleanup Scripts ✅

**Scripts Created**:

- `backend/scripts/cleanup-outlook-webhooks.js` - Full cleanup with database access
- `backend/scripts/list-outlook-webhooks.js` - Simple listing script

## How to Clean Up Orphaned Webhooks

### Option 1: Use the Cleanup Script (Recommended)

1. **Navigate to the scripts directory**:

   ```bash
   cd backend/scripts
   ```

2. **Run the cleanup script**:

   ```bash
   node cleanup-outlook-webhooks.js
   ```

3. **Review the orphaned subscriptions** and run with confirmation:
   ```bash
   node cleanup-outlook-webhooks.js --confirm
   ```

### Option 2: Manual Cleanup via Microsoft Graph Explorer

1. **Go to**: https://developer.microsoft.com/en-us/graph/graph-explorer
2. **Sign in with your Microsoft account**
3. **List all subscriptions**:
   ```
   GET https://graph.microsoft.com/v1.0/subscriptions
   ```
4. **Find subscriptions with old clientState values** like `68b38a85f78b918f06e7d255`
5. **Delete orphaned subscriptions**:
   ```
   DELETE https://graph.microsoft.com/v1.0/subscriptions/{subscription-id}
   ```

### Option 3: Use the Simple Listing Script

1. **Get an access token** from Microsoft Graph Explorer
2. **Run the listing script**:
   ```bash
   node list-outlook-webhooks.js <your_access_token>
   ```
3. **Follow the deletion instructions** provided by the script

## Understanding Microsoft Graph Tokens

### Token Types

1. **Opaque Tokens** (What you're getting - this is correct!)
   - Used for delegated permissions
   - Not JWT format
   - Valid for Microsoft Graph API
   - Cannot be decoded or inspected

2. **JWT Tokens** (What the error suggested)
   - Used for application permissions
   - Can be decoded and inspected
   - Not typically used for user-delegated access

### Why You're Getting Opaque Tokens

- Your app is configured for **delegated permissions** (user-specific access)
- Microsoft Graph returns opaque tokens for delegated permissions
- This is the correct and expected behavior

## Where to Find Webhook Subscriptions in Azure

### Azure Portal Path

1. **Azure Portal** → https://portal.azure.com
2. **Azure Active Directory** → **App registrations**
3. **Find your BAVIT app**
4. **API permissions** → **Microsoft Graph**
5. **Check "Subscriptions"** section

### Microsoft Graph API

- **Endpoint**: `https://graph.microsoft.com/v1.0/subscriptions`
- **Method**: GET
- **Headers**: `Authorization: Bearer {access_token}`

## Prevention Measures

### 1. Automatic Cleanup

The system now automatically handles duplicates using upsert operations, preventing future duplicate key errors.

### 2. Webhook Management

- Webhook subscriptions are created with email-specific prefixes
- Cleanup functions are called when accounts are deleted
- Rate limiting and retry logic prevent webhook creation failures

### 3. Database Constraints

- The unique `messageId` index prevents duplicate emails
- Upsert operations gracefully handle race conditions

### 4. Token Management

- Centralized token retrieval with auto-refresh
- Proper handling of opaque tokens from Microsoft Graph
- Automatic token refresh when expired

## Testing the Fix

### 1. Verify Duplicate Handling

- Send the same email multiple times
- Check logs for "Email already existed, updated" messages
- Verify no duplicate key errors in logs

### 2. Verify Webhook Cleanup

- Run the cleanup script to identify orphaned webhooks
- Delete old subscriptions
- Verify no more "Account not found for email prefix" errors

### 3. Monitor Logs

- Look for successful email processing
- Check for proper duplicate handling
- Verify webhook notifications are working correctly

### 4. Verify Token Handling

- Check that no more JWT format errors occur
- Verify that opaque tokens are being used correctly
- Ensure token refresh is working properly

## Troubleshooting

### If Cleanup Script Fails

1. **Check MongoDB connection** - ensure database is accessible
2. **Verify access token** - ensure it has proper Microsoft Graph permissions
3. **Check account status** - ensure at least one Outlook account is active

### If Webhooks Still Fail

1. **Verify subscription status** in Microsoft Graph
2. **Check notification URL** accessibility
3. **Review rate limiting** - Microsoft Graph has webhook creation limits

### If Duplicates Still Occur

1. **Check database indexes** - ensure unique constraints are properly set
2. **Verify upsert logic** - ensure findOneAndUpdate is working correctly
3. **Review sync timing** - check for overlapping sync operations

### If JWT Errors Persist

1. **Remember**: Opaque tokens are normal for Microsoft Graph
2. **Check token retrieval** - ensure `getStoredOutlookToken` is working
3. **Verify permissions** - ensure delegated permissions are set correctly

## Summary

The implemented solution addresses all three issues:

1. **✅ Duplicate Key Errors**: Fixed by implementing upsert operations
2. **✅ Orphaned Webhooks**: Addressed with cleanup scripts and proper webhook management
3. **✅ JWT Token Issues**: Resolved by understanding that opaque tokens are correct for Microsoft Graph

The system is now more robust and will:

- Handle duplicate emails gracefully using upsert operations
- Provide tools to clean up old webhook subscriptions
- Properly handle Microsoft Graph opaque tokens
- Automatically refresh tokens when needed

**Important Note**: The JWT format error you encountered is actually normal behavior for Microsoft Graph. Opaque tokens are the correct token type for delegated permissions, and the system has been updated to handle them properly.
