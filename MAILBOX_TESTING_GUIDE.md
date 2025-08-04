# Mailbox System Testing Guide

## AWS SES Inbound Email Setup

### 1. AWS SES Configuration
To receive inbound emails, you need to configure AWS SES:

1. **Configure Email Receiving Rule Set**:
   - Go to AWS SES Console
   - Navigate to "Email receiving" → "Rule sets"
   - Create a new rule set or use the default one
   - Add a rule for your domain

2. **Configure SNS Topic**:
   - Create an SNS topic (e.g., `ses-inbound-emails`)
   - Set the endpoint to your webhook URL: `https://your-domain.com/mailbox/webhook/process`
   - Configure the rule to publish to this SNS topic

3. **DNS Setup**:
   - Add MX record pointing to AWS SES inbound mail servers
   - Example: `10 inbound-smtp.us-east-1.amazonaws.com`

## Testing Endpoints in Postman

### Base URL
```
http://localhost:3000/api/v1/mailbox
```

### 1. **Test Inbound Email Processing (Webhook)**
**Endpoint**: `POST /webhook/process`
**Auth**: None (webhook endpoint)
**Headers**: 
```json
{
  "Content-Type": "application/json"
}
```

**Test Payload (SNS Format)**:
```json
{
  "Type": "Notification",
  "MessageId": "test-message-id",
  "TopicArn": "arn:aws:sns:us-east-1:123456789012:ses-inbound",
  "Message": "{\"eventType\":\"receive\",\"mail\":{\"timestamp\":\"2024-01-01T12:00:00.000Z\",\"source\":\"sender@example.com\",\"messageId\":\"test-inbound-message-id\",\"destination\":[\"recipient@yourdomain.com\"],\"commonHeaders\":{\"from\":[\"sender@example.com\"],\"to\":[\"recipient@yourdomain.com\"],\"subject\":\"Test Inbound Email\",\"messageId\":\"test-inbound-message-id\"},\"headers\":[{\"name\":\"From\",\"value\":\"sender@example.com\"},{\"name\":\"To\",\"value\":\"recipient@yourdomain.com\"},{\"name\":\"Subject\",\"value\":\"Test Inbound Email\"}]}}",
  "Timestamp": "2024-01-01T12:00:00.000Z",
  "SignatureVersion": "1",
  "Signature": "test-signature",
  "SigningCertURL": "https://sns.us-east-1.amazonaws.com/cert.pem",
  "UnsubscribeURL": "https://sns.us-east-1.amazonaws.com/unsubscribe"
}
```

**Alternative Direct SES Format**:
```json
{
  "eventType": "receive",
  "mail": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "source": "sender@example.com",
    "messageId": "test-inbound-message-id",
    "destination": ["recipient@yourdomain.com"],
    "commonHeaders": {
      "from": ["sender@example.com"],
      "to": ["recipient@yourdomain.com"],
      "subject": "Test Inbound Email",
      "messageId": "test-inbound-message-id"
    },
    "headers": [
      {
        "name": "From",
        "value": "sender@example.com"
      },
      {
        "name": "To",
        "value": "recipient@yourdomain.com"
      },
      {
        "name": "Subject",
        "value": "Test Inbound Email"
      }
    ]
  }
}
```

### 2. **Send Outbound Email**
**Endpoint**: `POST /send`
**Auth**: Bearer Token
**Headers**: 
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Payload**:
```json
{
  "to": "recipient@example.com",
  "subject": "Test Outbound Email",
  "body": "This is a test email from the mailbox system.",
  "html": "<p>This is a <strong>test email</strong> from the mailbox system.</p>",
  "from": "sender@yourdomain.com",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "type": "general"
}
```

### 3. **Get Email Threads for User**
**Endpoint**: `GET /threads`
**Auth**: Bearer Token
**Query Parameters**:
```
?userEmail=recipient@yourdomain.com&page=1&limit=10&status=active
```

### 4. **Get Thread Conversation**
**Endpoint**: `GET /threads/{threadId}/conversation`
**Auth**: Bearer Token
**Query Parameters**:
```
?userEmail=recipient@yourdomain.com&markAsRead=true
```

### 5. **Get All Emails**
**Endpoint**: `GET /emails`
**Auth**: Bearer Token
**Query Parameters**:
```
?page=1&limit=20&direction=inbound&type=general&status=received
```

### 6. **Send Marketing Email**
**Endpoint**: `POST /email/send-marketing`
**Auth**: Bearer Token
**Payload**:
```json
{
  "to": ["customer1@example.com", "customer2@example.com"],
  "subject": "Special Offer - 50% Off!",
  "body": "Don't miss out on our special offer!",
  "html": "<h1>Special Offer</h1><p>Don't miss out on our <strong>50% off</strong> special offer!</p>",
  "from": "marketing@yourdomain.com"
}
```

### 7. **Create Marketing Campaign**
**Endpoint**: `POST /campaigns`
**Auth**: Bearer Token
**Payload**:
```json
{
  "name": "Winter Sale Campaign",
  "subject": "Winter Sale - Up to 70% Off",
  "message": "Get ready for our biggest winter sale event!",
  "recipients": ["customer1@example.com", "customer2@example.com", "customer3@example.com"]
}
```

### 8. **Send SMS**
**Endpoint**: `POST /sms/send`
**Auth**: Bearer Token
**Payload**:
```json
{
  "to": "+1234567890",
  "message": "Your order has been confirmed. Thank you for shopping with us!"
}
```

### 9. **Subscribe to Newsletter**
**Endpoint**: `POST /newsletter/subscribe`
**Auth**: Bearer Token
**Payload**:
```json
{
  "email": "subscriber@example.com"
}
```

### 10. **Update Thread Status**
**Endpoint**: `PATCH /threads/{threadId}`
**Auth**: Bearer Token
**Payload**:
```json
{
  "status": "closed",
  "assignedTo": "USER_OBJECT_ID",
  "tags": ["resolved", "customer-support"]
}
```

## Testing Sequence

### Complete Inbound Email Flow Test:

1. **Send Test Webhook** (`POST /webhook/process`)
   - Use the inbound email payload above
   - Should create email and thread in database

2. **Verify Email Created** (`GET /emails`)
   - Check that the inbound email appears
   - Note the `threadId` from response

3. **Get Threads** (`GET /threads`)
   - Use `userEmail=recipient@yourdomain.com`
   - Should show the thread created from inbound email

4. **Get Thread Conversation** (`GET /threads/{threadId}/conversation`)
   - Use the `threadId` from step 2
   - Should show the inbound email in conversation format

5. **Send Reply** (`POST /send`)
   - Use same subject (add "Re: " prefix)
   - Should add to existing thread

6. **Verify Thread Updated** (`GET /threads/{threadId}/conversation`)
   - Should now show both inbound and outbound emails
   - Message count should be 2

### Marketing Flow Test:

1. **Create Campaign** (`POST /campaigns`)
2. **Send Marketing Email** (`POST /email/send-marketing`)
3. **Subscribe to Newsletter** (`POST /newsletter/subscribe`)
4. **Get Subscribers** (`GET /newsletter/subscribers`)
5. **Send SMS** (`POST /sms/send`)

## Expected Responses

### Successful Inbound Email Processing:
```json
{
  "success": true,
  "data": {
    "_id": "email_object_id",
    "messageId": "test-inbound-message-id",
    "threadId": "thread_test_inbound_email",
    "direction": "inbound",
    "subject": "Test Inbound Email",
    "from": {
      "email": "sender@example.com"
    },
    "to": [
      {
        "email": "recipient@yourdomain.com"
      }
    ],
    "receivedAt": "2024-01-01T12:00:00.000Z",
    "isRead": false,
    "status": "received"
  }
}
```

### Thread Conversation Response:
```json
{
  "success": true,
  "data": {
    "thread": {
      "threadId": "thread_test_inbound_email",
      "subject": "Test Inbound Email",
      "participants": [
        {
          "email": "sender@example.com"
        },
        {
          "email": "recipient@yourdomain.com"
        }
      ],
      "messageCount": 2,
      "unreadCount": 1
    },
    "conversation": [
      {
        "sequenceNumber": 1,
        "direction": "inbound",
        "subject": "Test Inbound Email",
        "from": {
          "email": "sender@example.com"
        },
        "isFirstMessage": true,
        "isLastMessage": false
      },
      {
        "sequenceNumber": 2,
        "direction": "outbound",
        "subject": "Re: Test Inbound Email",
        "from": {
          "email": "recipient@yourdomain.com"
        },
        "isFirstMessage": false,
        "isLastMessage": true
      }
    ],
    "summary": {
      "totalMessages": 2,
      "sentMessages": 1,
      "receivedMessages": 1,
      "participants": 2
    }
  }
}
```

## Error Responses

### Invalid Webhook Payload:
```json
{
  "success": false,
  "message": "Invalid SES notification signature."
}
```

### Missing Authentication:
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

## Notes

1. **Authentication**: All endpoints except `/webhook/process` require JWT authentication
2. **Rate Limiting**: Email sending endpoints have rate limiting
3. **Thread Management**: Emails with similar subjects are automatically grouped into threads
4. **Webhook Security**: In production, implement proper SNS signature verification
5. **Email Content**: The webhook payload may need adjustment based on your actual SES configuration

## Production Considerations

1. **SNS Signature Verification**: Implement proper signature verification for webhooks
2. **Error Handling**: Add retry mechanisms for failed email processing
3. **Monitoring**: Set up monitoring for webhook endpoint health
4. **Scaling**: Consider using SQS for high-volume email processing
5. **Security**: Implement IP whitelisting for webhook endpoints if needed
