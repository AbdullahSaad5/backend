# Enhanced Gmail Sync System

## Overview

The enhanced Gmail sync system integrates with the existing email infrastructure to provide efficient email synchronization using Gmail's History API. This system maintains backward compatibility while adding powerful new capabilities without requiring additional cloud infrastructure.

## Architecture

### Existing Structure Integration

The enhanced system builds upon the existing email infrastructure:

- **Email Accounts**: Stored in `EmailAccountModel` with OAuth credentials
- **Sync Endpoints**: Existing `/api/email-account/accounts/:accountId/sync` endpoint
- **Multi-folder Support**: Existing multi-folder sync capabilities
- **Provider Support**: Gmail, Outlook, IMAP support maintained

### New Enhanced Features

1. **Gmail History API**: Efficient incremental syncing using `users.history.list`
2. **Sync State Tracking**: Persistent sync progress and status
3. **Efficient Polling**: Smart polling with History API (no webhooks required)
4. **Error Recovery**: Automatic retry mechanisms
5. **Rate Limit Management**: Intelligent quota and rate limiting

## Database Schema Enhancements

### EmailAccountModel Sync State

```typescript
syncState?: {
  lastHistoryId?: string;           // Gmail History API tracking
  syncStatus: "initial" | "historical" | "complete" | "error";
  lastSyncAt?: Date;
  syncProgress?: {
    totalProcessed: number;
    currentBatch: number;
    estimatedTotal: number;
  };
  quotaUsage?: {
    daily: number;
    lastReset: Date;
  };
}
```

## API Endpoints

### Enhanced Sync Endpoints

#### 1. Traditional Sync (Backward Compatible)
```http
POST /api/email-account/accounts/:accountId/sync
```
- Uses existing sync logic
- Automatically switches to History API for Gmail OAuth accounts
- Supports `fetchAll` parameter

#### 2. Gmail History API Sync (New)
```http
POST /api/email-account/accounts/:accountId/sync-gmail-history
```
- Dedicated endpoint for Gmail History API sync
- Only works with Gmail OAuth accounts
- Returns detailed sync status and historyId

### Response Format

```json
{
  "success": true,
  "data": {
    "historyId": "12345",
    "totalProcessed": 150,
    "newEmailsCount": 25,
    "syncStatus": "complete",
    "account": {
      "id": "account_id",
      "emailAddress": "user@gmail.com",
      "accountName": "Gmail Account",
      "lastSyncAt": "2024-01-15T10:30:00Z"
    }
  },
  "message": "Gmail History API sync completed. Status: complete"
}
```

## Sync Phases

### Phase 1: Initial Sync
- Fetches recent emails (50-100 messages)
- Captures initial `historyId`
- Updates sync status to "historical"

### Phase 2: Historical Sync
- Uses History API to fetch all historical changes
- Processes in batches of 100
- Handles rate limiting and quota management
- Updates sync status to "complete"

### Phase 3: Ongoing Sync
- Efficient polling every 15 minutes for active accounts
- Uses History API for incremental updates
- Maintains sync state and progress

## Cron Jobs

### Gmail Sync Cron (`GmailSyncCron`)

#### Regular Sync (Every 15 minutes)
```typescript
cron.schedule("*/15 * * * *", async () => {
  // Process accounts needing sync
});
```

#### Error Recovery (Every 2 hours)
```typescript
cron.schedule("0 */2 * * *", async () => {
  // Reset error accounts for retry
});
```

#### Health Check (Every hour)
```typescript
cron.schedule("0 * * * *", async () => {
  // Monitor sync health and alert issues
});
```

## Configuration

### Environment Variables

```env
# Gmail API Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
```

### Gmail API Scopes Required

```typescript
const scopes = [
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];
```

## Usage Examples

### 1. Manual Sync (Traditional)
```javascript
// This will automatically use History API for Gmail OAuth accounts
const response = await fetch("/api/email-account/accounts/accountId/sync", {
  method: "POST",
  headers: { Authorization: "Bearer token" },
});
```

### 2. Manual Gmail History API Sync
```javascript
const response = await fetch("/api/email-account/accounts/accountId/sync-gmail-history", {
  method: "POST",
  headers: { Authorization: "Bearer token" },
});
```

### 3. Check Sync Status
```javascript
const account = await EmailAccountModel.findById(accountId);
console.log("Sync Status:", account.syncState?.syncStatus);
console.log("Last History ID:", account.syncState?.lastHistoryId);
console.log("Last Sync At:", account.syncState?.lastSyncAt);
```

## Error Handling

### Common Error Scenarios

1. **Token Expired**: Automatic refresh via existing OAuth service
2. **Quota Exceeded**: Pause sync and retry later
3. **API Errors**: Exponential backoff and retry
4. **Network Issues**: Graceful degradation

### Error Recovery

```typescript
// Automatic error recovery
if (account.syncState?.syncStatus === "error") {
  // Reset to initial state for retry
  await EmailAccountModel.findByIdAndUpdate(account._id, {
    $set: {
      "syncState.syncStatus": "initial",
      "syncState.lastError": null,
      "syncState.lastErrorAt": null,
    },
  });
}
```

## Monitoring and Alerts

### Health Metrics

- Total Gmail accounts
- Accounts by sync status (initial, historical, complete, error)
- API quota usage
- Error rates

### Alert Conditions

- More than 20% of accounts in error state
- High API quota usage
- Sync failures for extended periods

## Migration from Existing System

### Automatic Migration

1. **Existing accounts**: Continue using traditional sync
2. **New Gmail OAuth accounts**: Automatically use History API
3. **Manual upgrade**: Use `/sync-gmail-history` endpoint

### Backward Compatibility

- All existing endpoints continue to work
- Traditional sync logic preserved
- Multi-folder sync maintained
- OAuth token management unchanged

## Performance Benefits

### API Efficiency

- **Traditional**: 1 API call per email
- **History API**: 1 API call per batch (100 emails)
- **Efficient Polling**: Smart polling every 15 minutes

### Rate Limit Management

- Automatic quota tracking
- Intelligent batching
- Exponential backoff
- Rate limit respect

### Real-time Updates

- 15-minute polling interval
- Efficient change detection
- Minimal API usage
- Scalable architecture

## Security Considerations

### OAuth Security

- Encrypted token storage
- Automatic token refresh
- Secure credential handling
- Access token rotation

## Troubleshooting

### Common Issues

1. **History API Errors**: Verify OAuth scopes
2. **Sync Stuck**: Check quota and rate limits
3. **Token Issues**: Check OAuth configuration

### Debug Endpoints

```http
GET /api/email-account/accounts/:accountId/debug
```

## Future Enhancements

1. **Outlook Graph API**: Similar History API for Outlook
2. **Advanced Filtering**: Label-based sync
3. **Bulk Operations**: Batch email operations
4. **Analytics**: Sync performance metrics
5. **Webhook Integration**: Optional Google Cloud Pub/Sub setup
