# Inbound Email Processor Lambda

This AWS Lambda function processes inbound emails from Amazon SES and stores them in MongoDB. It supports both SNS notifications and S3 event triggers with enhanced email parsing.

## Setup

1. **Environment Variables**: Make sure your Lambda function has the `MONGODB_URI` environment variable set.

2. **Dependencies**: The function requires:

   - `mongoose` for MongoDB connection
   - `aws-sdk` for AWS services

3. **IAM Permissions**: Your Lambda function needs the following permissions:
   - `s3:GetObject` for reading emails from S3 bucket
   - `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` for CloudWatch logs

## Event Types Supported

### S3 Events (Current Setup)

Your Lambda is currently configured to receive S3 events when emails are stored in your S3 bucket (`bmr-ses-inbound-emails`). The function will:

1. Read the raw email content from S3
2. Parse the email headers and body
3. Extract sender, recipient, subject, and other metadata
4. Parse email content (text and HTML)
5. Extract thread information for conversation tracking
6. Store the processed email in MongoDB

### SNS Events (Alternative Setup)

The function also supports SNS notifications from SES. Use `test-event.json` for testing SNS events.

## Enhanced Email Parsing

The function now extracts comprehensive email data including:

### Core Fields

- `messageId`: Unique identifier for the email
- `threadId`: Thread identifier for conversation grouping
- `subject`: Email subject line
- `from`: Sender information (email and name)
- `to`: Recipient information (email and name)
- `cc`: Carbon copy recipients
- `bcc`: Blind carbon copy recipients
- `replyTo`: Reply-to address

### Content Fields

- `textContent`: Plain text version of the email
- `htmlContent`: HTML version of the email
- `rawEmailData`: Complete raw email for reference

### Metadata Fields

- `headers`: All email headers
- `attachments`: File attachments (structure ready)
- `receivedAt`: Timestamp when email was received
- `direction`: Inbound/outbound
- `type`: Email classification (general, support, marketing, etc.)
- `priority`: Email priority (low, normal, high, urgent)
- `status`: Processing status

### Thread Management

- Automatically extracts thread ID from `References` or `In-Reply-To` headers
- Groups related emails in conversations
- Maintains conversation context

## Testing the Lambda Function

### Common Issues and Solutions

The error you encountered (`Cannot read properties of undefined (reading 'Message')`) typically occurs when:

1. **Wrong test event structure**: The test event doesn't match the expected S3/SNS structure
2. **Missing S3/SNS data**: The event doesn't contain the expected properties
3. **Invalid JSON in Message**: The `Message` property contains invalid JSON (for SNS events)

### MongoDB Deprecation Warnings

The function now uses the latest MongoDB driver without deprecated options. You may see warnings about `useNewUrlParser` and `useUnifiedTopology` - these have been removed as they're no longer needed in newer MongoDB driver versions.

### Proper Test Event Structures

#### For S3 Events (Current Setup)

**Real S3 Event** (`test-s3-event.json`):
Use this for testing with actual S3 objects that exist in your bucket:

```json
{
  "Records": [
    {
      "eventSource": "aws:s3",
      "s3": {
        "bucket": {
          "name": "your-bucket-name"
        },
        "object": {
          "key": "actual-email-object-key"
        }
      }
    }
  ]
}
```

**Test S3 Event** (`test-s3-event-skip.json`):
Use this for testing the event structure without requiring an actual S3 object:

```json
{
  "Records": [
    {
      "eventSource": "aws:s3",
      "s3": {
        "bucket": {
          "name": "your-bucket-name"
        },
        "object": {
          "key": "test-enhanced-email-key"
        }
      }
    }
  ]
}
```

_Note: The function will automatically skip processing objects with keys containing "test-" or "example" to avoid S3 errors during testing._

#### For SNS Events (Alternative Setup)

Use the `test-event.json` file for SNS testing:

```json
{
  "Records": [
    {
      "EventSource": "aws:sns",
      "Sns": {
        "Message": "{\"eventType\":\"receipt\",\"mail\":{...}}"
      }
    }
  ]
}
```

### Debugging Steps

1. **Check the logs**: The updated function now logs the event structure, which will help identify the issue
2. **Validate event structure**: The function now validates the event structure before processing
3. **Use proper test data**: Use the provided test event files for testing
4. **Check S3 permissions**: Ensure your Lambda has permission to read from the S3 bucket

### Testing in AWS Console

1. Go to your Lambda function in the AWS Console
2. Click on the "Test" tab
3. Create a new test event using `test-s3-event.json` for S3 testing
4. Run the test and check the CloudWatch logs for detailed debugging information

### Expected Behavior

When working correctly, you should see logs like:

- "Event structure: ..."
- "Processing 1 records"
- "Processing S3 event" (or "Processing SNS event")
- "Reading email from S3: bucket-name/object-key"
- "Raw email content length: ..."
- "Email saved from S3: [message-id]" (or "Email saved from SNS: [message-id]")

### Troubleshooting

If you still see errors:

1. **Check MongoDB connection**: Ensure `MONGODB_URI` is set correctly
2. **Verify event structure**: Use the provided test events
3. **Check CloudWatch logs**: Look for detailed error messages
4. **Validate S3 permissions**: Ensure Lambda has `s3:GetObject` permission for your bucket
5. **Check SES configuration**: Ensure SES is properly configured to store emails in S3

## Email Classification

The function automatically classifies emails based on:

### Email Types

- **AMAZON_ORDER**: Emails from Amazon domains
- **EBAY_MESSAGE**: Emails from eBay domains
- **SUPPORT**: Emails from support/help domains
- **MARKETING**: Marketing/newsletter emails
- **SYSTEM**: System/noreply emails
- **GENERAL**: All other emails

### Priority Levels

- **URGENT**: Contains "urgent", "asap", "emergency"
- **HIGH**: Contains "important", "critical", "priority"
- **LOW**: Contains "newsletter", "marketing", "promotion"
- **NORMAL**: Default priority

## SES Configuration

For S3-based email processing (current setup):

1. Configure SES to store incoming emails in S3
2. Set up S3 event notifications to trigger your Lambda function
3. Ensure the Lambda function has proper IAM permissions to read from the S3 bucket

For SNS-based email processing (alternative):

1. Configure SES to send notifications to SNS
2. Subscribe your Lambda function to the SNS topic
3. Use the SNS test event for testing

## Deployment

Use the provided scripts in `package.json`:

```bash
npm run package
npm run deploy
```

Make sure to update the function name in the deploy script to match your actual Lambda function name.
