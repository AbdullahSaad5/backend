import AWS from 'aws-sdk';

// AWS SES Configuration
export const awsSesConfig = {
  region: process.env.AWS_SES_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  apiVersion: '2010-12-01',
  // Optional: Configuration set for tracking
  configurationSetName: process.env.AWS_SES_CONFIGURATION_SET,
};

// Configure AWS SDK for SES
AWS.config.update({
  region: awsSesConfig.region,
  accessKeyId: awsSesConfig.accessKeyId,
  secretAccessKey: awsSesConfig.secretAccessKey,
});

// Create SES instance
export const ses = new AWS.SES({ apiVersion: awsSesConfig.apiVersion });

// Email configuration
export const emailConfig = {
  defaultFromEmail: process.env.DEFAULT_FROM_EMAIL || 'noreply@yourdomain.com',
  defaultFromName: process.env.DEFAULT_FROM_NAME || 'Your App Name',
  replyToEmail: process.env.REPLY_TO_EMAIL || 'noreply@yourdomain.com',
  // Rate limiting (SES sandbox: 1 email per second, 200 per day)
  maxSendRate: parseInt(process.env.SES_MAX_SEND_RATE || '14'), // emails per second (production limit)
  maxSendQuota: parseInt(process.env.SES_MAX_SEND_QUOTA || '50000'), // emails per 24 hours (production limit)
};

// Validate required environment variables
export const validateSesConfig = () => {
  const requiredVars = [
    'AWS_SES_ACCESS_KEY_ID',
    'AWS_SES_SECRET_ACCESS_KEY',
    'AWS_SES_REGION',
    'DEFAULT_FROM_EMAIL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Missing AWS SES environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
};
