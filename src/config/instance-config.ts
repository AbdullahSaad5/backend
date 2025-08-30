export interface InstanceConfig {
  instanceId: string;
  environment: "development" | "staging" | "production";
  gmailWebhookUrl: string;
  outlookWebhookUrl: string;
  gmailSubscriptionName: string;
  outlookSubscriptionName: string;
  isActive: boolean;
}

export const INSTANCE_CONFIGS: InstanceConfig[] = [
  {
    instanceId: "development",
    environment: "development",
    gmailWebhookUrl: "https://bavit-dev-1eb6ed0cf94e.herokuapp.com/api/gmail-webhook/webhook",
    outlookWebhookUrl: "https://bavit-dev-1eb6ed0cf94e.herokuapp.com/api/outlook-webhook",
    gmailSubscriptionName: "gmail-sync-notifications-sub",
    outlookSubscriptionName: "outlook-sync-notifications-sub",
    isActive: true,
  },
  {
    instanceId: "testing",
    environment: "staging",
    gmailWebhookUrl: "https://bavit-test-bc872f1d3e07.herokuapp.com/api/gmail-webhook/webhook",
    outlookWebhookUrl: "https://bavit-test-bc872f1d3e07.herokuapp.com/api/outlook-webhook",
    gmailSubscriptionName: "gmail-sync-notifications-sub-testing",
    outlookSubscriptionName: "outlook-sync-notifications-sub-testing",
    isActive: true,
  },
  {
    instanceId: "production",
    environment: "production",
    gmailWebhookUrl: "https://admin.buildmyrig.co.uk/api/gmail-webhook/webhook",
    outlookWebhookUrl: "https://backend.buildmyrig.co.uk/api/outlook-webhook",
    gmailSubscriptionName: "gmail-sync-notifications-sub-production",
    outlookSubscriptionName: "outlook-sync-notifications-sub-production",
    isActive: true,
  },
];

export const getCurrentInstanceConfig = (): InstanceConfig | null => {
  const currentInstanceId = process.env.INSTANCE_ID || "production";
  return INSTANCE_CONFIGS.find((config) => config.instanceId === currentInstanceId) || null;
};

export const getInstanceConfigById = (instanceId: string): InstanceConfig | null => {
  return INSTANCE_CONFIGS.find((config) => config.instanceId === instanceId) || null;
};

export const getAllActiveInstances = (): InstanceConfig[] => {
  return INSTANCE_CONFIGS.filter((config) => config.isActive);
};

export const getGmailWebhookUrl = (): string | null => {
  const config = getCurrentInstanceConfig();
  return config?.gmailWebhookUrl || null;
};

export const getOutlookWebhookUrl = (): string | null => {
  const config = getCurrentInstanceConfig();
  return config?.outlookWebhookUrl || null;
};

export const getGmailSubscriptionName = (): string | null => {
  const config = getCurrentInstanceConfig();
  return config?.gmailSubscriptionName || null;
};

export const getOutlookSubscriptionName = (): string | null => {
  const config = getCurrentInstanceConfig();
  return config?.outlookSubscriptionName || null;
};
