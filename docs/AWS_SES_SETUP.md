# AWS SES Email Service Setup

## 🎯 Overview
This project uses AWS SES (Simple Email Service) with Nodemailer to handle email functionality in the Marketing module.

## 📦 Packages Installed
- `nodemailer` - Email sending library
- `aws-sdk` - AWS SDK for SES integration
- `@types/nodemailer` - TypeScript definitions

## 🔧 Configuration Files
- `src/config/awsSes.ts` - AWS SES configuration and setup
- `.env.ses.example` - Example environment variables

## 🌍 Environment Variables
Add these to your `.env` file:

```bash
# AWS SES Configuration
AWS_SES_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SES_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_SES_REGION=us-east-1

# Email Configuration
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=Your App Name
REPLY_TO_EMAIL=support@yourdomain.com

# Rate Limiting (adjust based on your SES limits)
SES_MAX_SEND_RATE=1
SES_MAX_SEND_QUOTA=200
```

## 🏗️ MVC Structure
Following the existing codebase structure:

- **Model**: `src/models/marketing.model.ts`
- **Controller**: `src/controllers/marketing.controller.ts`
- **Service**: `src/services/marketing.service.ts`
- **Routes**: `src/routes/marketing.route.ts`
- **Contracts**: `src/contracts/marketing.contract.ts`

## 🛠️ Available API Endpoints

### Email Routes
- **POST** `/marketing/email/send` - Send email
- **GET** `/marketing/email/test-connection` - Test SES connection
- **GET** `/marketing/email/stats` - Get sending statistics
- **GET** `/marketing/email/history/:userId` - Get email history

### SMS Routes (Ready for integration)
- **POST** `/marketing/sms/send` - Send SMS
- **GET** `/marketing/sms/history/:userId` - Get SMS history

### Campaign Routes
- **POST** `/marketing/campaigns` - Create marketing campaign
- **GET** `/marketing/campaigns` - List campaigns

### Newsletter Routes
- **POST** `/marketing/newsletter/subscribe` - Subscribe to newsletter
- **GET** `/marketing/newsletter/subscribers` - List subscribers

## 🔒 AWS SES Setup Steps

### 1. Create AWS IAM User
1. Go to AWS IAM Console
2. Create new user with programmatic access
3. Attach policy: `AmazonSESFullAccess`
4. Save Access Key ID and Secret Access Key

### 2. Verify Domain/Email
1. Go to AWS SES Console
2. Navigate to "Verified identities"
3. Add and verify your sending domain or email
4. Complete DNS verification (for domains)

### 3. Request Production Access
If you need more than 200 emails/day:
1. Go to AWS SES Console
2. Navigate to "Account dashboard"
3. Click "Request production access"
4. Fill out the form with your use case

### 4. Configure Environment Variables
Copy `.env.ses.example` contents to your `.env` file and update with your values.

## 🚀 Usage Examples

### Send Simple Email
```javascript
POST /marketing/email/send
{
  "to": "user@example.com",
  "subject": "Welcome!",
  "body": "Welcome to our platform!"
}
```

### Send HTML Email
```javascript
POST /marketing/email/send
{
  "to": "user@example.com",
  "subject": "Welcome!",
  "body": "Welcome to our platform!",
  "html": "<h1>Welcome!</h1><p>Welcome to our platform!</p>"
}
```

### Send Email with CC/BCC
```javascript
POST /marketing/email/send
{
  "to": "user@example.com",
  "subject": "Important Update",
  "body": "This is an important update.",
  "cc": "manager@example.com",
  "bcc": "archive@example.com"
}
```

## 📊 Monitoring & Limits

### Sandbox Limits (Default)
- **Rate**: 1 email per second
- **Quota**: 200 emails per 24 hours
- **Recipients**: Only verified emails

### Production Limits (After approval)
- **Rate**: 14+ emails per second
- **Quota**: 50,000+ emails per 24 hours
- **Recipients**: Any email address

### Check Current Limits
```javascript
GET /marketing/email/stats
```

## 🔍 Testing

### Test Connection
```javascript
GET /marketing/email/test-connection
```

### Check Sending Statistics
```javascript
GET /marketing/email/stats
```

## 🚨 Error Handling
The service includes comprehensive error handling for:
- Invalid email addresses
- Rate limit exceeded
- AWS credentials issues
- Network failures
- Bounce/complaint handling

## 📈 Next Steps
- Implement SNS for bounce/complaint handling
- Add email templates
- Set up CloudWatch monitoring
- Implement email scheduling
- Add more advanced campaign features

## 🔧 Troubleshooting

### Common Issues
1. **"Email not verified"** - Verify your sending email/domain in SES
2. **"Rate exceeded"** - You're hitting sending limits
3. **"Credentials not found"** - Check environment variables
4. **"Region not supported"** - Ensure SES is available in your region

### Debug Mode
Set `NODE_ENV=development` to see detailed logs.
