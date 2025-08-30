import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { TokenInitializationService } from "@/services/token-initialization.service";
import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";
import { getStoredAmazonAccessToken } from "@/utils/amazon-helpers.util";
import { IntegrationTokenModel } from "@/models/integration-token.model";

const router = Router();

/**
 * GET /api/tokens/status
 * Get the current status of all tokens
 */
router.get("/status", async (req, res) => {
  try {
    const tokens = await IntegrationTokenModel.find({}).lean();

    const tokenStatus = tokens.map((token: any) => ({
      provider: token.provider,
      environment: token.environment,
      hasAccessToken: !!token.access_token,
      hasRefreshToken: !!token.refresh_token,
      expiresAt: token.generated_at + token.expires_in * 1000,
      isExpired: Date.now() > token.generated_at + token.expires_in * 1000,
      generatedAt: new Date(token.generated_at).toISOString(),
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      tokens: tokenStatus,
      totalTokens: tokens.length,
    });
  } catch (error) {
    console.error("Error getting token status:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to get token status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/tokens/initialize
 * Initialize all tokens (eBay and Amazon)
 */
router.post("/initialize", async (req, res) => {
  try {
    console.log("🚀 Manual token initialization requested");

    // Validate environment variables first
    const envValidation = TokenInitializationService.validateEnvironmentVariables();

    if (!envValidation.valid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Missing required environment variables",
        missing: envValidation.missing,
        template: TokenInitializationService.generateEnvTemplate(),
      });
    }

    // Initialize tokens
    const results = await TokenInitializationService.initializeAllTokens();

    const successful = results.filter((r) => r.success).length;
    const total = results.length;
    const newTokens = results.filter((r) => r.tokenObtained).length;

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Token initialization complete: ${successful}/${total} successful`,
      results,
      summary: {
        total,
        successful,
        newTokens,
        failed: total - successful,
      },
    });
  } catch (error) {
    console.error("Error initializing tokens:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to initialize tokens",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/tokens/test
 * Test token functionality by making API calls
 */
router.post("/test", async (req, res) => {
  try {
    const testResults = [];

    // Test eBay token
    try {
      const ebayToken = await getStoredEbayAccessToken();
      testResults.push({
        provider: "ebay",
        success: !!ebayToken,
        message: ebayToken ? "eBay token is valid" : "eBay token failed",
      });
    } catch (error) {
      testResults.push({
        provider: "ebay",
        success: false,
        message: `eBay token error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }

    // Test Amazon token
    try {
      const amazonToken = await getStoredAmazonAccessToken();
      testResults.push({
        provider: "amazon",
        success: !!amazonToken,
        message: amazonToken ? "Amazon token is valid" : "Amazon token failed",
      });
    } catch (error) {
      testResults.push({
        provider: "amazon",
        success: false,
        message: `Amazon token error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }

    const allSuccessful = testResults.every((result) => result.success);

    res.status(StatusCodes.OK).json({
      success: allSuccessful,
      message: allSuccessful ? "All tokens are working" : "Some tokens have issues",
      results: testResults,
    });
  } catch (error) {
    console.error("Error testing tokens:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to test tokens",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ❌ REMOVED: Dangerous route that deletes all tokens
// This route was causing tokens to be accidentally deleted
// If you need to clear tokens for testing, do it manually in the database

/**
 * GET /api/tokens/env-check
 * Check environment variable configuration
 */
router.get("/env-check", (req, res) => {
  try {
    const validation = TokenInitializationService.validateEnvironmentVariables();

    res.status(StatusCodes.OK).json({
      success: validation.valid,
      valid: validation.valid,
      missing: validation.missing,
      template: validation.valid ? null : TokenInitializationService.generateEnvTemplate(),
      message: validation.valid
        ? "All required environment variables are present"
        : `Missing ${validation.missing.length} required environment variables`,
    });
  } catch (error) {
    console.error("Error checking environment:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to check environment variables",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
