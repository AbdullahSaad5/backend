# Gmail Real-time Email Sync Setup Guide

## Overview

This guide explains how to set up real-time Gmail email syncing using Google Cloud Pub/Sub webhooks. When configured, new emails will be instantly synced to your system as they arrive in Gmail.

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **Gmail API** enabled
3. **Pub/Sub API** enabled
4. **Public webhook endpoint** accessible from Google Cloud

## Step 1: Google Cloud Project Setup

### 1.1 Create Google Cloud Project
```bash
# Create new project
gcloud projects create your-project-id --name="Your Project Name"

# Set as default project
gcloud config set project your-project-id

# Enable billing
gcloud billing projects link your-project-id --billing-account=YOUR_BILLING_ACCOUNT_ID
```

### 1.2 Enable Required APIs
```bash
# Enable Gmail API
gcloud services enable gmail.googleapis.com

# Enable Pub/Sub API
gcloud services enable pubsub.googleapis.com
```

## Step 2: Create Pub/Sub Topic and Subscription

### 2.1 Create Topic
```bash
# Create the topic for Gmail notifications
gcloud pubsub topics create gmail-notifications
```

### 2.2 Create Subscription
```bash
# Create subscription with push delivery to your webhook
gcloud pubsub subscriptions create gmail-notifications-sub \
  --topic=gmail-notifications \
  --push-endpoint=https://your-domain.com/api/gmail/webhook \
  --push-auth-service-account=your-service-account@your-project-id.iam.gserviceaccount.com
```

## Step 3: Create Service Account

### 3.1 Create Service Account
```bash
# Create service account
gcloud iam service-accounts create gmail-webhook-sa \
  --display-name="Gmail Webhook Service Account"

# Get the service account email
gcloud iam service-accounts list --filter="displayName:Gmail Webhook"
```

### 3.2 Grant Permissions
```bash
# Grant Pub/Sub Publisher role
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:gmail-webhook-sa@your-project-id.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Grant Pub/Sub Subscriber role
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:gmail-webhook-sa@your-project-id.iam.gserviceaccount.com" \
  --role="roles/pubsub.subscriber"
```

## Step 4: Environment Configuration

### 4.1 Backend Environment Variables
Add to your `.env` file:
```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Gmail API Configuration
GOOGLE_CLIENT_ID=your_gmail_client_id
GOOGLE_CLIENT_SECRET=your_gmail_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri

# Webhook Configuration
GMAIL_WEBHOOK_SECRET=your_webhook_secret
```

### 4.2 Service Account Key
```bash
# Create service account key
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=gmail-webhook-sa@your-project-id.iam.gserviceaccount.com

# Copy to your server
scp service-account-key.json your-server:/path/to/credentials/
```

## Step 5: Webhook Endpoint Configuration

### 5.1 Public URL
Your webhook endpoint must be publicly accessible:
```
https://your-domain.com/api/gmail/webhook
```

### 5.2 SSL Certificate
Ensure your domain has a valid SSL certificate (required by Google Cloud Pub/Sub).

### 5.3 Firewall Configuration
Allow incoming requests from Google Cloud IP ranges:
```bash
# Google Cloud IP ranges (update as needed)
iptables -A INPUT -s 35.199.0.0/16 -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -s 35.198.0.0/16 -p tcp --dport 443 -j ACCEPT
```

## Step 6: Testing the Setup

### 6.1 Test Webhook Endpoint
```bash
# Test health endpoint
curl https://your-domain.com/api/gmail/webhook/health

# Expected response:
{
  "success": true,
  "message": "Gmail webhook is healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 6.2 Test Manual Notification
```bash
# Test with sample notification
curl -X POST https://your-domain.com/api/gmail/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "emailAddress": "test@gmail.com",
    "historyId": "12345"
  }'
```

## Step 7: Frontend Integration

### 7.1 Setup Watch Button
The frontend now includes a "Setup Watch" button in the AccountManagementModal for Gmail accounts.

### 7.2 Watch Status Display
Real-time watch status is displayed with badges:
- 🟢 **Watching**: Active real-time sync
- 🔴 **Watch expired**: Needs renewal
- ⚪ **No watch**: Not set up

## Step 8: Monitoring and Maintenance

### 8.1 Watch Renewal
Watches expire every 7 days. The system automatically renews them every 6 hours.

### 8.2 Logs
Monitor webhook logs:
```bash
# View webhook logs
tail -f /var/log/your-app/gmail-webhook.log

# Check for errors
grep "ERROR" /var/log/your-app/gmail-webhook.log
```

### 8.3 Health Checks
```bash
# Automated health check
curl -s https://your-domain.com/api/gmail/webhook/health | jq '.success'
```

## Troubleshooting

### Common Issues

#### 1. Webhook Not Receiving Notifications
- Check if the webhook endpoint is publicly accessible
- Verify SSL certificate is valid
- Check firewall rules
- Review Pub/Sub subscription configuration

#### 2. Authentication Errors
- Verify service account has correct permissions
- Check service account key file path
- Ensure GOOGLE_APPLICATION_CREDENTIALS is set

#### 3. Watch Setup Fails
- Check Gmail API quota limits
- Verify OAuth tokens are valid
- Review Gmail API scopes

#### 4. Notifications Not Processing
- Check webhook endpoint logs
- Verify account exists in database
- Review History API calls

### Debug Commands
```bash
# Check Pub/Sub topic
gcloud pubsub topics list

# Check subscriptions
gcloud pubsub subscriptions list

# View subscription details
gcloud pubsub subscriptions describe gmail-notifications-sub

# Check service account permissions
gcloud projects get-iam-policy your-project-id \
  --flatten="bindings[].members" \
  --filter="bindings.members:gmail-webhook-sa@your-project-id.iam.gserviceaccount.com"
```

## Security Considerations

### 1. Service Account Security
- Store service account keys securely
- Use minimal required permissions
- Rotate keys regularly

### 2. Webhook Security
- Validate request source (User-Agent)
- Implement rate limiting
- Monitor for suspicious activity

### 3. Data Privacy
- Encrypt sensitive data
- Log minimal information
- Follow data retention policies

## Performance Optimization

### 1. Webhook Processing
- Process notifications asynchronously
- Implement retry logic
- Monitor processing times

### 2. Database Optimization
- Index email account queries
- Batch database operations
- Monitor query performance

### 3. API Quota Management
- Monitor Gmail API usage
- Implement exponential backoff
- Handle quota exceeded errors

## Cost Considerations

### 1. Google Cloud Costs
- Pub/Sub topic: ~$0.40/month
- Pub/Sub messages: ~$0.40 per million messages
- Gmail API calls: Free tier available

### 2. Infrastructure Costs
- Public IP address
- SSL certificate
- Server resources for webhook processing

## Support

For issues with this setup:
1. Check the troubleshooting section
2. Review Google Cloud logs
3. Check application logs
4. Contact support with detailed error information
