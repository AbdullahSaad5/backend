# Outlook Email Flow Enhancement

This document describes the comprehensive enhancement of the Outlook email flow in the BAVIT system, making it functionally equivalent to the Gmail flow.

## Overview

The Outlook email flow has been enhanced to provide the same level of functionality as Gmail, including:

- **Microsoft Graph API integration** for sending emails
- **Enhanced threading** using Outlook's conversationId
- **Proper reply handling** with thread context
- **Unified email service** that handles both Gmail and Outlook seamlessly

## Architecture

### 1. OutlookEmailService

A dedicated service for handling Outlook-specific operations using Microsoft Graph API.

**Key Features:**

- Send emails via Microsoft Graph API
- Send replies with proper threading headers
- Create drafts on Outlook servers
- Handle OAuth token management

**Location:** `src/services/outlook-email.service.ts`

### 2. UnifiedEmailService

A unified interface that routes requests to the appropriate service based on account type.

**Key Features:**

- Automatic routing to Gmail, Outlook, or SMTP services
- Consistent API across all providers
- Provider-specific capability detection
- Fallback handling for unsupported features

**Location:** `src/services/unified-email.service.ts`

### 3. Enhanced EmailThreadingService

Improved threading logic specifically for Outlook accounts.

**Key Features:**

- Outlook-specific thread finding using conversationId
- Reply detection and subject normalization
- Enhanced thread matching algorithms
- Support for Outlook's threading patterns

**Location:** `src/services/email-threading.service.ts`

## API Endpoints

### Send Email

```http
POST /api/email-client/send/:accountId
Content-Type: application/json
Authorization: Bearer <token>

{
  "to": "recipient@example.com",
  "subject": "Test Email",
  "text": "Plain text content",
  "html": "<p>HTML content</p>",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "attachments": [],
  "threadId": "optional-thread-id",
  "inReplyTo": "optional-message-id",
  "references": ["optional-references"]
}
```

### Send Reply

```http
POST /api/email-client/reply/:accountId
Content-Type: application/json
Authorization: Bearer <token>

{
  "originalMessageId": "message-id-to-reply-to",
  "to": "sender@example.com",
  "subject": "Re: Original Subject",
  "text": "Reply content",
  "html": "<p>Reply HTML</p>",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"]
}
```

## Flow Comparison

### Gmail Flow (Existing)

1. **OAuth Authentication** → Google OAuth2
2. **Email Sending** → SMTP with OAuth2
3. **Threading** → Gmail threadId
4. **Reply Handling** → SMTP with threading headers

### Outlook Flow (Enhanced)

1. **OAuth Authentication** → Microsoft OAuth2
2. **Email Sending** → Microsoft Graph API
3. **Threading** → conversationId + enhanced algorithms
4. **Reply Handling** → Graph API with threading context

## Key Improvements

### 1. Microsoft Graph API Integration

- **Direct API calls** instead of SMTP
- **Better error handling** with detailed error messages
- **Native threading support** using conversationId
- **Real-time status updates** from Microsoft

### 2. Enhanced Threading

- **conversationId detection** for primary threading
- **Subject-based fallback** for legacy emails
- **Reply pattern recognition** (Re:, RE:, Re[1]:, etc.)
- **Reference chain building** for complex conversations

### 3. Unified Interface

- **Single API endpoint** for all providers
- **Automatic provider detection** and routing
- **Consistent response format** across providers
- **Capability detection** for feature availability

## Configuration

### Environment Variables

```env
# Microsoft OAuth Configuration
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
OAUTH_REDIRECT_URI=http://localhost:5000/api/email-account/oauth
```

### Account Setup

1. **OAuth Flow** → User authenticates with Microsoft
2. **Token Storage** → Encrypted tokens stored in database
3. **Automatic Refresh** → Tokens refreshed before expiry
4. **Provider Detection** → System automatically routes to Outlook service

## Threading Algorithm

### Priority Order

1. **conversationId** (Outlook native)
2. **References header** (RFC 2822 standard)
3. **In-Reply-To header** (RFC 2822 standard)
4. **Subject + Sender matching** (fallback)
5. **Recent duplicate detection** (last 24 hours)
6. **New thread creation** (if no match found)

### Reply Detection

```typescript
const replyPatterns = [
  /^re:\s*/i, // Re: Subject
  /^re\[.*?\]:\s*/i, // Re[1]: Subject
  /^re\s*\(.*?\):\s*/i, // Re (2): Subject
];
```

## Error Handling

### Token Management

- **Automatic refresh** before expiry
- **Graceful fallback** for expired tokens
- **Re-authentication prompts** when needed
- **Detailed error logging** for debugging

### API Failures

- **Retry logic** for transient failures
- **Fallback to SMTP** if Graph API unavailable
- **User-friendly error messages**
- **Comprehensive logging** for troubleshooting

## Testing

### Test Coverage

- **Unit tests** for all services
- **Integration tests** for API endpoints
- **Mock testing** for Microsoft Graph API
- **Error scenario testing** for edge cases

### Test Coverage

**Areas Covered:**

- Email sending via Graph API
- Reply handling with threading
- Draft creation
- Error handling scenarios
- Token refresh logic

## Performance Considerations

### Caching

- **Token caching** to reduce API calls
- **Thread information caching** for repeated lookups
- **Connection pooling** for Graph API calls

### Rate Limiting

- **Microsoft Graph API limits** (10,000 requests per 10 minutes)
- **Automatic throttling** when approaching limits
- **Batch processing** for multiple operations

## Security

### OAuth Security

- **Encrypted token storage** in database
- **Secure token refresh** process
- **Scope-limited permissions** (Mail.Read, Mail.Send, etc.)
- **Automatic token rotation** for security

### Data Protection

- **Email content encryption** in transit
- **Secure API communication** via HTTPS
- **User authentication** required for all operations
- **Audit logging** for compliance

## Migration Guide

### For Existing Users

1. **No changes required** for Gmail accounts
2. **Automatic detection** of account types
3. **Seamless switching** between providers
4. **Backward compatibility** maintained

### For New Outlook Users

1. **OAuth setup** via Microsoft account
2. **Automatic configuration** detection
3. **Enhanced features** available immediately
4. **Full threading support** from first email

## Troubleshooting

### Common Issues

#### Token Expiry

**Symptoms:** "Failed to get Outlook access token"
**Solution:** Re-authenticate the account

#### Graph API Limits

**Symptoms:** "Rate limit exceeded"
**Solution:** Wait for rate limit reset or implement throttling

#### Threading Issues

**Symptoms:** Emails not grouped correctly
**Solution:** Check conversationId and threading headers

### Debug Mode

Enable detailed logging by setting:

```env
LOG_LEVEL=debug
EMAIL_DEBUG=true
```

## Future Enhancements

### Planned Features

1. **Real-time sync** via Microsoft Graph webhooks
2. **Advanced filtering** and search capabilities
3. **Bulk operations** for multiple emails
4. **Calendar integration** via Graph API
5. **Contact management** and address book sync

### Scalability Improvements

1. **Distributed caching** for high-traffic scenarios
2. **Async processing** for bulk operations
3. **Queue-based processing** for large email volumes
4. **Horizontal scaling** support

## Conclusion

The enhanced Outlook email flow provides feature parity with Gmail while leveraging Microsoft's native Graph API capabilities. The unified service architecture ensures consistent behavior across all email providers while maintaining the flexibility to use provider-specific features when available.

This enhancement significantly improves the user experience for Outlook users and provides a solid foundation for future email provider integrations.
