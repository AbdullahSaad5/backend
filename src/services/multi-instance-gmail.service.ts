import { PubSub } from "@google-cloud/pubsub";
import { logger } from "@/utils/logger.util";
import { InstanceConfig, getCurrentInstanceConfig, getAllActiveInstances } from "@/config/instance-config";

export class MultiInstanceGmailService {
  private static pubsub: PubSub;
  private static readonly TOPIC_NAME = "gmail-sync-notifications";
  private static readonly PROJECT_ID = "build-my-rig-468317";

  /**
   * Initialize Pub/Sub client
   */
  private static async getPubSubClient(): Promise<PubSub> {
    if (!this.pubsub) {
      this.pubsub = new PubSub({
        projectId: this.PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });
    }
    return this.pubsub;
  }

  /**
   * Get current instance configuration
   */
  static getCurrentInstance(): InstanceConfig | null {
    return getCurrentInstanceConfig();
  }

  /**
   * Get all active instances
   */
  static getAllInstances(): InstanceConfig[] {
    return getAllActiveInstances();
  }

  /**
   * Create subscription for a specific instance
   */
  static async createInstanceSubscription(instanceConfig: InstanceConfig): Promise<void> {
    try {
      const pubsub = await this.getPubSubClient();
      const topic = pubsub.topic(this.TOPIC_NAME);

      logger.info(`Creating subscription for instance ${instanceConfig.instanceId}`, {
        subscriptionName: instanceConfig.subscriptionName,
        webhookUrl: instanceConfig.webhookUrl,
        environment: instanceConfig.environment,
      });

      await topic.createSubscription(instanceConfig.subscriptionName, {
        pushConfig: {
          pushEndpoint: instanceConfig.webhookUrl,
          attributes: {
            "x-goog-version": "v1",
            "instance-id": instanceConfig.instanceId,
            environment: instanceConfig.environment,
          },
        },
        ackDeadlineSeconds: 60,
        messageRetentionDuration: {
          seconds: 604800, // 7 days
        },
      });

      logger.info(`Subscription created successfully for instance ${instanceConfig.instanceId}`);
    } catch (error: any) {
      logger.error(`Failed to create subscription for instance ${instanceConfig.instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Delete subscription for a specific instance
   */
  static async deleteInstanceSubscription(instanceId: string): Promise<void> {
    try {
      const instanceConfig = getAllActiveInstances().find((config) => config.instanceId === instanceId);
      if (!instanceConfig) {
        throw new Error(`Instance configuration not found for ${instanceId}`);
      }

      const pubsub = await this.getPubSubClient();
      const subscription = pubsub.subscription(instanceConfig.subscriptionName);

      logger.info(`Deleting subscription for instance ${instanceId}`);

      await subscription.delete();
      logger.info(`Subscription deleted successfully for instance ${instanceId}`);
    } catch (error: any) {
      logger.error(`Failed to delete subscription for instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Get subscription statistics for all instances
   */
  static async getAllInstanceStats(): Promise<any[]> {
    try {
      const instances = getAllActiveInstances();
      const stats = [];

      for (const instance of instances) {
        try {
          const instanceStats = await this.getInstanceStats(instance.instanceId);
          stats.push(instanceStats);
        } catch (error: any) {
          logger.error(`Failed to get stats for instance ${instance.instanceId}:`, error);
          stats.push({
            instanceId: instance.instanceId,
            error: error.message,
          });
        }
      }

      return stats;
    } catch (error: any) {
      logger.error("Failed to get all instance stats:", error);
      throw error;
    }
  }

  /**
   * Get subscription statistics for a specific instance
   */
  static async getInstanceStats(instanceId: string): Promise<any> {
    try {
      const instanceConfig = getAllActiveInstances().find((config) => config.instanceId === instanceId);
      if (!instanceConfig) {
        throw new Error(`Instance configuration not found for ${instanceId}`);
      }

      const pubsub = await this.getPubSubClient();
      const subscription = pubsub.subscription(instanceConfig.subscriptionName);

      const [metadata] = await subscription.getMetadata();

      return {
        instanceId,
        environment: instanceConfig.environment,
        subscriptionName: metadata.name,
        pushEndpoint: metadata.pushConfig?.pushEndpoint,
        ackDeadlineSeconds: metadata.ackDeadlineSeconds,
        messageRetentionDuration: metadata.messageRetentionDuration,
        numUndeliveredMessages: (metadata as any).numUndeliveredMessages || 0,
        numOutstandingMessages: (metadata as any).numOutstandingMessages || 0,
        lastSeekTime: (metadata as any).lastSeekTime,
        isActive: instanceConfig.isActive,
      };
    } catch (error: any) {
      logger.error(`Failed to get stats for instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Update webhook URL for a specific instance
   */
  static async updateInstanceWebhookUrl(instanceId: string, newWebhookUrl: string): Promise<void> {
    try {
      const instanceConfig = getAllActiveInstances().find((config) => config.instanceId === instanceId);
      if (!instanceConfig) {
        throw new Error(`Instance configuration not found for ${instanceId}`);
      }

      const pubsub = await this.getPubSubClient();
      const subscription = pubsub.subscription(instanceConfig.subscriptionName);

      logger.info(`Updating webhook URL for instance ${instanceId}`, {
        oldUrl: instanceConfig.webhookUrl,
        newUrl: newWebhookUrl,
      });

      await subscription.setMetadata({
        pushConfig: {
          pushEndpoint: newWebhookUrl,
          attributes: {
            "x-goog-version": "v1",
            "instance-id": instanceId,
            environment: instanceConfig.environment,
          },
        },
      });

      logger.info(`Webhook URL updated successfully for instance ${instanceId}`);
    } catch (error: any) {
      logger.error(`Failed to update webhook URL for instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Test webhook endpoint for a specific instance
   */
  static async testInstanceWebhook(instanceId: string): Promise<any> {
    try {
      const instanceConfig = getAllActiveInstances().find((config) => config.instanceId === instanceId);
      if (!instanceConfig) {
        throw new Error(`Instance configuration not found for ${instanceId}`);
      }

      const healthUrl = `${instanceConfig.webhookUrl}/health`;

      // You can implement HTTP request here or use a simple check
      logger.info(`Testing webhook for instance ${instanceId}`, {
        healthUrl,
        webhookUrl: instanceConfig.webhookUrl,
      });

      return {
        instanceId,
        webhookUrl: instanceConfig.webhookUrl,
        healthUrl,
        status: "test_initiated",
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error(`Failed to test webhook for instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Setup all instance subscriptions
   */
  static async setupAllInstances(): Promise<void> {
    try {
      const instances = getAllActiveInstances();
      logger.info(`Setting up subscriptions for ${instances.length} instances`);

      for (const instance of instances) {
        try {
          await this.createInstanceSubscription(instance);
        } catch (error: any) {
          logger.error(`Failed to setup instance ${instance.instanceId}:`, error);
          // Continue with other instances
        }
      }

      logger.info("All instance subscriptions setup completed");
    } catch (error: any) {
      logger.error("Failed to setup all instances:", error);
      throw error;
    }
  }
}
