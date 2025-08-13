# Gmail Watch Setup - Quick Guide

## Environment Variables Required

Add these to your `.env` file:

```env
# Google Cloud Project ID (Required for Gmail watch)
GOOGLE_CLOUD_PROJECT=build-my-rig-468317

# Gmail API Configuration
GOOGLE_CLIENT_ID=your_gmail_client_id
GOOGLE_CLIENT_SECRET=your_gmail_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri

# Optional: Service Account Key Path (if using service account)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## Current Error Fix

The error you're seeing:

```
Invalid topicName does not match projects/build-my-rig-468317/topics/*
```

**Solution**: Set the `GOOGLE_CLOUD_PROJECT` environment variable to your actual Google Cloud project ID.

## Steps to Fix

1. **Add to your `.env` file**:

   ```env
   GOOGLE_CLOUD_PROJECT=build-my-rig-468317
   ```

2. **Restart your server** to load the new environment variable

3. **Test the setup** by clicking "Setup Watch" in the AccountManagementModal

## Verify Setup

Check your logs for:

```
info: Using topic: projects/build-my-rig-468317/topics/gmail-notifications for Gmail watch setup
info: Gmail watch setup completed for your-email@gmail.com, expires: [timestamp]
```

## Next Steps

After fixing the environment variable:

1. **Create the Pub/Sub topic** (if not exists):

   ```bash
   gcloud pubsub topics create gmail-notifications
   ```

2. **Create the subscription**:

   ```bash
   gcloud pubsub subscriptions create gmail-notifications-sub \
     --topic=gmail-notifications \
     --push-endpoint=https://your-domain.com/api/gmail/webhook
   ```

3. **Test real-time sync** by sending an email to your Gmail account

## Troubleshooting

If you still get errors:

1. **Check project ID**: Verify `build-my-rig-468317` is your correct Google Cloud project ID
2. **Check permissions**: Ensure your OAuth tokens have Gmail API access
3. **Check topic exists**: Verify the `gmail-notifications` topic exists in your project
4. **Check logs**: Look for detailed error information in the server logs
