import { getApplicationAuthToken } from "@/utils/ebay-helpers.util";
import { getAmazonAccessToken } from "@/utils/amazon-helpers.util";
import { IntegrationTokenModel } from "@/models/integration-token.model";

interface TokenInitializationResult {
  success: boolean;
  provider: string;
  environment: string;
  error?: string;
  tokenObtained?: boolean;
}

/**
 * Centralized token initialization service
 * Handles initial token acquisition when database is empty
 */
export class TokenInitializationService {
  /**
   * Initialize all tokens for both eBay and Amazon
   */
  static async initializeAllTokens(): Promise<TokenInitializationResult[]> {
    // console.log("🚀 Starting token initialization for all providers...");

    const results: TokenInitializationResult[] = [];

    // Initialize eBay tokens
    const ebayResults = await this.initializeEbayTokens();
    results.push(...ebayResults);

    // Initialize Amazon tokens
    const amazonResults = await this.initializeAmazonTokens();
    results.push(...amazonResults);

    // Log summary
    const successful = results.filter((r) => r.success).length;
    const total = results.length;
    // console.log(`📊 Token initialization complete: ${successful}/${total} successful`);

    return results;
  }

  /**
   * Initialize eBay tokens
   */
  static async initializeEbayTokens(): Promise<TokenInitializationResult[]> {
    const results: TokenInitializationResult[] = [];

    try {
      const envVal = process.env.EBAY_TOKEN_ENV === "sandbox" ? "SANDBOX" : "PRODUCTION";

      // Check if USER token already exists
      const existingToken = await IntegrationTokenModel.findOne({
        provider: "ebay",
        environment: envVal,
        useClient: true,
      });

      if (existingToken) {
        console.log(`✅ eBay ${envVal} token already exists in database`);
        results.push({
          success: true,
          provider: "ebay",
          environment: envVal,
          tokenObtained: false, // Already existed
        });
        return results;
      }

      // Do not auto-create user tokens here; require OAuth consent
      results.push({
        success: true,
        provider: "ebay",
        environment: envVal,
        tokenObtained: false,
      });
    } catch (error) {
      const envVal = process.env.EBAY_TOKEN_ENV === "sandbox" ? "SANDBOX" : "PRODUCTION";
      results.push({
        success: false,
        provider: "ebay",
        environment: envVal,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return results;
  }

  /**
   * Initialize Amazon tokens
   */
  static async initializeAmazonTokens(): Promise<TokenInitializationResult[]> {
    const results: TokenInitializationResult[] = [];

    try {
      const envVal = process.env.AMAZON_TOKEN_ENV === "production" ? "PRODUCTION" : "SANDBOX";

      // Check if token already exists
      const existingToken = await IntegrationTokenModel.findOne({
        provider: "amazon",
        environment: envVal,
        useClient: false,
      });

      if (existingToken) {
        console.log(`✅ Amazon ${envVal} token already exists in database`);
        results.push({
          success: true,
          provider: "amazon",
          environment: envVal,
          tokenObtained: false, // Already existed
        });
        return results;
      }

      // Get new token
      // console.log(`🔄 Getting Amazon ${envVal} token...`);
      const token = await getAmazonAccessToken();

      if (token?.access_token) {
        results.push({
          success: true,
          provider: "amazon",
          environment: envVal,
          tokenObtained: true,
        });
      } else {
        results.push({
          success: false,
          provider: "amazon",
          environment: envVal,
          error: "Failed to obtain token - check credentials and network connection",
        });
      }
    } catch (error) {
      const envVal = process.env.AMAZON_TOKEN_ENV === "production" ? "PRODUCTION" : "SANDBOX";
      results.push({
        success: false,
        provider: "amazon",
        environment: envVal,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return results;
  }

  /**
   * Check if all required environment variables are present
   */
  static validateEnvironmentVariables(): { valid: boolean; missing: string[] } {
    const requiredVars = [
      // Environment control variables
      "AMAZON_TOKEN_ENV",
      "EBAY_TOKEN_ENV",
    ];

    // Add Amazon variables based on environment
    const amazonEnv = process.env.AMAZON_TOKEN_ENV;
    if (amazonEnv === "sandbox") {
      requiredVars.push("AMAZON_CLIENT_ID_SANDBOX", "AMAZON_CLIENT_SECRET_SANDBOX");
    } else {
      requiredVars.push("SELLING_PARTNER_APP_CLIENT_ID_PROD", "SELLING_PARTNER_APP_CLIENT_SECRET_PROD");
    }

    // Add eBay variables based on environment
    const ebayEnv = process.env.EBAY_TOKEN_ENV;
    if (ebayEnv === "sandbox") {
      requiredVars.push("EBAY_CLIENT_ID_SANDBOX", "EBAY_CLIENT_SECRET_SANDBOX", "EBAY_REDIRECT_URI_SANDBOX");
    } else {
      requiredVars.push("EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET", "EBAY_REDIRECT_URI");
    }

    const missing = requiredVars.filter((varName) => !process.env[varName]);

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Generate environment variables template
   */
  static generateEnvTemplate(): string {
    return `
# Environment Control Variables
AMAZON_TOKEN_ENV=production  # Options: production, sandbox
EBAY_TOKEN_ENV=production    # Options: production, sandbox

# eBay Production Environment Variables
EBAY_CLIENT_ID=your_ebay_production_client_id
EBAY_CLIENT_SECRET=your_ebay_production_client_secret
EBAY_REDIRECT_URI=your_ebay_production_redirect_uri

# eBay Sandbox Environment Variables
EBAY_CLIENT_ID_SANDBOX=your_ebay_sandbox_client_id
EBAY_CLIENT_SECRET_SANDBOX=your_ebay_sandbox_client_secret
EBAY_REDIRECT_URI_SANDBOX=your_ebay_sandbox_redirect_uri

# Amazon Production Environment Variables
SELLING_PARTNER_APP_CLIENT_ID_PROD=your_amazon_production_client_id
SELLING_PARTNER_APP_CLIENT_SECRET_PROD=your_amazon_production_client_secret

# Amazon Sandbox Environment Variables (if using sandbox)
AMAZON_CLIENT_ID_SANDBOX=your_amazon_sandbox_client_id
AMAZON_CLIENT_SECRET_SANDBOX=your_amazon_sandbox_client_secret
`;
  }
}
