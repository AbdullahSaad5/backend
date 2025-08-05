# Email Thread Functionality

This document explains how the email thread functionality works in the inbound email processor.

## Overview

The email thread functionality ensures that related emails (original messages and their replies) are properly grouped together in the same thread, making it easier to track conversations and maintain context.

## How Threading Works

### 1. Thread ID Extraction

The system extracts thread IDs from email headers in the following priority order:

1. **References Header**: Contains a list of message IDs that this email is replying to
2. **In-Reply-To Header**: Contains the message ID that this email is directly replying to
3. **Message-ID**: For new threads, uses the current message's ID as the thread ID

### 2. Thread Lookup and Creation

When processing an email, the system:

1. **Extracts thread ID** from email headers
2. **Checks for existing threads** if the subject contains "Re:" (indicating a reply)
3. **Finds the original thread** by looking for emails with the same subject (without "Re:") and from the same sender
4. **Creates a new thread** if no existing thread is found

### 3. Thread Consistency

The system ensures thread consistency by:

- **Normalizing thread IDs**: Removing angle brackets and extra whitespace
- **Looking up existing threads**: Using subject and sender information
- **Maintaining thread references**: Ensuring all emails in a conversation use the same thread ID

## Key Methods

### `extractThreadId(headers, subject, fromEmail)`

Extracts thread ID from email headers and performs initial thread lookup.

**Parameters:**

- `headers`: Array of email headers
- `subject`: Email subject line
- `fromEmail`: Sender's email address

**Returns:** Thread ID string

### `findOrCreateThreadId(threadId, subject, fromEmail)`

Finds existing thread or creates a new one based on subject and sender.

**Parameters:**

- `threadId`: Initial thread ID from headers
- `subject`: Email subject line
- `fromEmail`: Sender's email address

**Returns:** Final thread ID string

### `getThreadInfo(threadId)`

Retrieves comprehensive information about a thread.

**Parameters:**

- `threadId`: Thread ID to look up

**Returns:** Thread information object with:

- `threadId`: Thread identifier
- `originalEmail`: First email in the thread
- `latestEmail`: Most recent email in the thread
- `emailCount`: Number of emails in the thread
- `emails`: Array of all emails in the thread
- `subject`: Original subject
- `participants`: Array of all email addresses involved

### `updateEmailThreadReferences(emailId, threadId)`

Updates an email's thread reference.

**Parameters:**

- `emailId`: Email document ID
- `threadId`: New thread ID

**Returns:** Boolean indicating success

## Usage Examples

### Processing Inbound Email

```javascript
const email = await EmailProcessor.processInboundEmail(sesNotification);
console.log("Email thread ID:", email.threadId);
```

### Processing Outbound Email

```javascript
const emailData = {
  messageId: "unique-message-id@example.com",
  subject: "Re: Original Subject",
  from: { email: "sender@example.com", name: "Sender Name" },
  to: [{ email: "recipient@example.com", name: "Recipient Name" }],
  headers: [
    { name: "In-Reply-To", value: "<original-message-id@example.com>" },
    { name: "References", value: "<original-message-id@example.com>" },
  ],
};

const email = await EmailProcessor.processOutboundEmail(emailData);
console.log("Outbound email thread ID:", email.threadId);
```

### Getting Thread Information

```javascript
const threadInfo = await EmailProcessor.getThreadInfo("thread-id-123");
if (threadInfo) {
  console.log("Thread subject:", threadInfo.subject);
  console.log("Number of emails:", threadInfo.emailCount);
  console.log("Participants:", threadInfo.participants);
}
```

## Thread Detection Logic

### Reply Detection

An email is considered a reply if:

- Subject contains "Re:" (case-insensitive)
- Has "In-Reply-To" header
- Has "References" header
- Content contains reply indicators

### Thread Matching

When looking for existing threads, the system:

1. Removes "Re:" prefix from subject
2. Searches for emails with similar subject (case-insensitive)
3. Matches sender email address
4. Returns the most recent matching email's thread ID

## Database Indexes

The following indexes are created to optimize thread queries:

- `threadId`: For quick thread lookups
- `subject`: For subject-based thread matching
- `from.email`: For sender-based matching
- `receivedAt`: For chronological ordering

## Testing

Run the thread functionality test:

```bash
node test-thread-functionality.js
```

This test verifies:

- Original email creation
- Reply processing
- Thread consistency
- Thread information retrieval
- Subject variation handling

## Troubleshooting

### Common Issues

1. **Emails not threading correctly**

   - Check email headers for proper "In-Reply-To" and "References"
   - Verify subject lines contain "Re:" for replies
   - Ensure sender email addresses match

2. **Thread ID inconsistencies**

   - Check database indexes are created
   - Verify thread ID normalization
   - Review thread lookup logic

3. **Performance issues**
   - Ensure database indexes are in place
   - Monitor query performance
   - Consider caching for frequently accessed threads

### Debug Logging

The system provides detailed logging for thread operations:

```
Using thread ID from References: <message-id@example.com>
Looking for existing thread with clean subject: Original Subject
Found existing thread: thread-id-123
Updated email thread reference: email-id -> thread-id-123
```

## Best Practices

1. **Always include proper headers** when sending emails
2. **Use consistent subject lines** for related emails
3. **Include "In-Reply-To" and "References"** headers for replies
4. **Test thread functionality** with various email clients
5. **Monitor thread consistency** in production

## Future Enhancements

- **Advanced thread matching**: Consider content similarity
- **Thread merging**: Combine related threads automatically
- **Thread analytics**: Track thread metrics and patterns
- **Real-time threading**: Update threads as emails arrive
