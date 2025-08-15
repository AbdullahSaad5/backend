#!/usr/bin/env node

/**
 * Multi-Instance Gmail Pub/Sub Setup Script
 *
 * This script creates separate Pub/Sub subscriptions for each instance
 * with different webhook endpoints.
 */

const { execSync } = require("child_process");
require("dotenv").config();

const PROJECT_ID = "build-my-rig-468317";
const TOPIC_NAME = "gmail-sync-notifications";
const SERVICE_ACCOUNT = "gmail-webhook-sa@build-my-rig-468317.iam.gserviceaccount.com";

// Instance configurations
const INSTANCES = [
  {
    instanceId: "instance1",
    environment: "development",
    webhookUrl: "https://bavit-dev-1eb6ed0cf94e.herokuapp.com/api/gmail/webhook",
    subscriptionName: "gmail-sync-notifications-sub",
  },
  {
    instanceId: "instance2",
    environment: "staging",
    webhookUrl: "https://bavit-test-bc872f1d3e07.herokuapp.com/api/gmail/webhook",
    subscriptionName: "gmail-sync-notifications-sub-testing",
  },
  {
    instanceId: "production",
    environment: "production",
    webhookUrl: "https://admin.buildmyrig.co.uk/api/gmail/webhook",
    subscriptionName: "gmail-sync-notifications-sub-production",
  },
];

function executeCommand(command, description) {
  console.log(`📋 ${description}`);
  console.log(`   Command: ${command}`);

  try {
    const output = execSync(command, { encoding: "utf8", stdio: "pipe" });
    console.log("   ✅ Success");
    if (output.trim()) {
      console.log(`   Output: ${output.trim()}`);
    }
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    if (error.stdout) console.log(`   Stdout: ${error.stdout}`);
    if (error.stderr) console.log(`   Stderr: ${error.stderr}`);
    throw error;
  }
  console.log("");
}

function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function setupMultiInstancePubSub() {
  console.log("🚀 Multi-Instance Gmail Pub/Sub Setup");
  console.log("=====================================");
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Topic: ${TOPIC_NAME}`);
  console.log(`Instances: ${INSTANCES.length}`);
  console.log("");

  try {
    // Check if gcloud CLI is installed
    if (!commandExists("gcloud")) {
      console.error("❌ Error: gcloud CLI is not installed");
      console.log("Please install gcloud CLI: https://cloud.google.com/sdk/docs/install");
      process.exit(1);
    }

    // Set project
    executeCommand(`gcloud config set project ${PROJECT_ID}`, "Setting Google Cloud project");

    // Check if topic exists
    console.log("🔍 Checking if topic exists...");
    try {
      executeCommand(`gcloud pubsub topics describe ${TOPIC_NAME}`, "Checking topic existence");
    } catch (error) {
      console.log("   ℹ️  Topic does not exist, creating...");
      executeCommand(`gcloud pubsub topics create ${TOPIC_NAME}`, "Creating Pub/Sub topic");
    }

    // Create subscriptions for each instance
    console.log("📨 Creating subscriptions for each instance...");

    for (const instance of INSTANCES) {
      console.log(`\n🔧 Setting up ${instance.environment} instance (${instance.instanceId})`);
      console.log(`   Webhook URL: ${instance.webhookUrl}`);
      console.log(`   Subscription: ${instance.subscriptionName}`);

      try {
        // Check if subscription already exists
        try {
          execSync(`gcloud pubsub subscriptions describe ${instance.subscriptionName}`, { stdio: "ignore" });
          console.log("   ℹ️  Subscription already exists, updating...");

          // Update existing subscription
          executeCommand(
            `gcloud pubsub subscriptions update ${instance.subscriptionName} \
              --push-endpoint=${instance.webhookUrl} \
              --push-auth-service-account=${SERVICE_ACCOUNT} \
              --ack-deadline=60`,
            `Updating subscription for ${instance.instanceId}`
          );
        } catch (error) {
          // Create new subscription
          executeCommand(
            `gcloud pubsub subscriptions create ${instance.subscriptionName} \
              --topic=${TOPIC_NAME} \
              --push-endpoint=${instance.webhookUrl} \
              --push-auth-service-account=${SERVICE_ACCOUNT} \
              --ack-deadline=60`,
            `Creating subscription for ${instance.instanceId}`
          );
        }

        console.log(`   ✅ ${instance.instanceId} setup completed`);
      } catch (error) {
        console.error(`   ❌ Failed to setup ${instance.instanceId}: ${error.message}`);
        // Continue with other instances
      }
    }

    // Verify all subscriptions
    console.log("\n✅ Verifying all subscriptions...");
    executeCommand("gcloud pubsub subscriptions list", "Listing all subscriptions");

    console.log("\n🎉 Multi-instance setup completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`   Topic: ${TOPIC_NAME}`);
    console.log(`   Total Subscriptions: ${INSTANCES.length}`);

    for (const instance of INSTANCES) {
      console.log(`   - ${instance.subscriptionName} → ${instance.webhookUrl}`);
    }

    console.log("\n📋 Next Steps:");
    console.log("1. Update your instance configurations with the correct webhook URLs");
    console.log("2. Set INSTANCE_ID environment variable for each instance");
    console.log("3. Test webhook endpoints for each instance");
    console.log("4. Setup Gmail watch for your email accounts");
  } catch (error) {
    console.error("\n💥 Setup failed:", error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(`
Multi-Instance Gmail Pub/Sub Setup Script

Usage:
  node scripts/setup-multi-instance-pubsub.js [options]

Options:
  --help               Show this help message

This script will create separate Pub/Sub subscriptions for each instance:
- gmail-sync-instance1 → https://instance1.your-domain.com/api/gmail/webhook
- gmail-sync-instance2 → https://instance2.your-domain.com/api/gmail/webhook
- gmail-sync-production → https://production.your-domain.com/api/gmail/webhook

Before running:
1. Update the INSTANCES array with your actual webhook URLs
2. Ensure gcloud CLI is installed and authenticated
3. Verify your service account has proper permissions
  `);
  process.exit(0);
}

// Run the setup
setupMultiInstancePubSub();
