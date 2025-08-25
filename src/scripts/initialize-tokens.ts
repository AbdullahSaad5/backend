#!/usr/bin/env ts-node

/**
 * Token Initialization Script
 *
 * This script initializes tokens for Amazon and eBay when the database is empty.
 * It can be run manually or called during application startup.
 *
 * Usage:
 *   npm run init-tokens
 *   or
 *   ts-node src/scripts/initialize-tokens.ts
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { TokenInitializationService } from "@/services/token-initialization.service";

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

async function main() {
  // console.log("🚀 Starting token initialization script...");

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/bavit";
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Validate environment variables
    console.log("🔍 Validating environment variables...");
    const envValidation = TokenInitializationService.validateEnvironmentVariables();

    if (!envValidation.valid) {
      console.error("❌ Missing required environment variables:");
      envValidation.missing.forEach((varName) => {
        console.error(`   - ${varName}`);
      });

      console.log("\n📝 Required environment variables template:");
      console.log(TokenInitializationService.generateEnvTemplate());

      process.exit(1);
    }

    console.log("✅ All required environment variables are present");

    // Initialize tokens
    console.log("🔧 Initializing tokens...");
    const results = await TokenInitializationService.initializeAllTokens();

    // Display results
    console.log("\n📊 Initialization Results:");
    console.log("=".repeat(50));

    results.forEach((result) => {
      const status = result.success ? "✅" : "❌";
      const action = result.tokenObtained ? "OBTAINED" : result.success ? "EXISTS" : "FAILED";

      console.log(`${status} ${result.provider.toUpperCase()} ${result.environment}: ${action}`);

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    // Summary
    const successful = results.filter((r) => r.success).length;
    const total = results.length;
    const newTokens = results.filter((r) => r.tokenObtained).length;

    console.log("\n" + "=".repeat(50));
    console.log(`📈 Summary: ${successful}/${total} tokens ready`);
    console.log(`🆕 New tokens obtained: ${newTokens}`);

    if (successful === total) {
      console.log("🎉 All tokens are ready! Your application can now access Amazon and eBay APIs.");
    } else {
      console.log("⚠️ Some tokens failed to initialize. Please check the errors above.");
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Fatal error during token initialization:", error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log("📡 Disconnected from MongoDB");
  }
}

// Handle uncaught errors
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

export { main as initializeTokens };
