export interface InstanceConfig {
  instanceId: string;
  environment: "development" | "staging" | "production";
  webhookUrl: string;
  subscriptionName: string;
  isActive: boolean;
}

export const INSTANCE_CONFIGS: InstanceConfig[] = [
  {
    instanceId: "instance1",
    environment: "development",
    webhookUrl: "https://bavit-dev-1eb6ed0cf94e.herokuapp.com/api/gmail/webhook",
    subscriptionName: "gmail-sync-notifications-sub",
    isActive: true,
  },
  {
    instanceId: "instance2",
    environment: "staging",
    webhookUrl: "https://bavit-test-bc872f1d3e07.herokuapp.com/api/gmail/webhook",
    subscriptionName: "gmail-sync-notifications-sub-testing",
    isActive: true,
  },
  {
    instanceId: "production",
    environment: "production",
    webhookUrl: "https://admin.buildmyrig.co.uk/api/gmail/webhook",
    subscriptionName: "gmail-sync-notifications-sub-production",
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
