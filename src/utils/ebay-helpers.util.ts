import EbayAuthToken from "ebay-oauth-nodejs-client";
import fs from "fs";
import dotenv from "dotenv";
import { IntegrationTokenModel } from "@/models/integration-token.model";

// Configure dotenv to use .env file like .env.dev or .env.prod
dotenv.config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

type EbayEnvironment = "SANDBOX" | "PRODUCTION";

// Helper function to get eBay environment from EBAY_TOKEN_ENV
const getEbayEnvironment = (): "PRODUCTION" | "SANDBOX" => {
  return process.env.EBAY_TOKEN_ENV === "sandbox" ? "SANDBOX" : "PRODUCTION";
};

// Validation function for eBay credentials
const validateEbayCredentials = (type: "production" | "sandbox") => {
  const requiredVars =
    type === "production"
      ? ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET", "EBAY_REDIRECT_URI"]
      : ["EBAY_CLIENT_ID_SANDBOX", "EBAY_CLIENT_SECRET_SANDBOX", "EBAY_REDIRECT_URI_SANDBOX"];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error(`❌ Missing eBay ${type} environment variables: ${missing.join(", ")}`);
    return false;
  }

  return true;
};

type EbayAuthTokenOptions = {
  clientId: string;
  clientSecret: string;
  env?: EbayEnvironment;
  baseUrl?: string;
  redirectUri?: string;
  scope?: string[] | string;
};

type EbayToken = { access_token: string; refresh_token: string; expires_in: number };

type EbayAuthOptions = { prompt?: "login" | "consent"; state?: string };

// All scopes required for the application
const scopes = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.messaging",
  // "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  // "https://api.ebay.com/oauth/api_scope/sell.marketing",
  // "https://api.ebay.com/oauth/api_scope/sell.analytics.readonly",
  // "https://api.ebay.com/oauth/api_scope/sell.finances",
  // "https://api.ebay.com/oauth/api_scope/sell.reporting",
  // "https://api.ebay.com/oauth/api_scope/sell.reputation",
  // Add other required scopes
];

// Create eBay auth token instances with validation
const createEbayAuthToken = (type: "production" | "sandbox") => {
  if (!validateEbayCredentials(type)) {
    return null;
  }

  if (type === "production") {
    return new EbayAuthToken({
      clientId: process.env.EBAY_CLIENT_ID!,
      clientSecret: process.env.EBAY_CLIENT_SECRET!,
      redirectUri: process.env.EBAY_REDIRECT_URI!,
      baseUrl: "api.ebay.com",
      env: "PRODUCTION",
    });
  } else {
    return new EbayAuthToken({
      clientId: process.env.EBAY_CLIENT_ID_SANDBOX!,
      clientSecret: process.env.EBAY_CLIENT_SECRET_SANDBOX!,
      redirectUri: process.env.EBAY_REDIRECT_URI_SANDBOX!,
      baseUrl: "api.sandbox.ebay.com",
      env: "SANDBOX",
    });
  }
};

const ebayAuthToken: any = createEbayAuthToken("production");
const ebayAuthTokenSandbox: any = createEbayAuthToken("sandbox");

// Options for generating user authorization URL
const options: EbayAuthOptions = { prompt: "consent" };

// Function to get application token and store in DB
export const getApplicationAuthToken = async (type: "production" | "sandbox" = "production") => {
  try {
    console.log(`🔐 Getting eBay application token for ${type}...`);

    // Validate credentials before attempting to get token
    if (!validateEbayCredentials(type)) {
      console.error(`❌ Invalid eBay ${type} credentials. Please check your environment variables.`);
      return null;
    }

    // Get the new access token using client credentials
    let token;
    if (type === "production") {
      if (!ebayAuthToken) {
        console.error("❌ eBay production auth token instance not initialized");
        return null;
      }
      console.log("🔵 [PRODUCTION] Getting application token for production");
      token = await ebayAuthToken.getApplicationToken("PRODUCTION");
    } else {
      if (!ebayAuthTokenSandbox) {
        console.error("❌ eBay sandbox auth token instance not initialized");
        return null;
      }
      console.log("🟣 [SANDBOX] Getting application token for sandbox");
      token = await ebayAuthTokenSandbox.getApplicationToken("SANDBOX");
    }

    if (!token) {
      console.error(`❌ Failed to get new eBay ${type} access token. Please verify your credentials.`);
      return null;
    }


    // Parse the new token
    const parsedToken: EbayToken = JSON.parse(token);



    // Store in DB
    const env: EbayEnvironment = type === "production" ? "PRODUCTION" : "SANDBOX";
    await IntegrationTokenModel.updateOne(
      { provider: "ebay", environment: env, useClient: false },
      { $set: { ...parsedToken, generated_at: Date.now() } },
      { upsert: true }
    );

    console.log(`✅ eBay application token stored in DB for ${type}`);
    return parsedToken;
  } catch (error) {
    console.error(`❌ Failed to get eBay application token for ${type}:`, error);
    return null;
  }
};

export const getStoredEbayAccessToken = async () => {
  try {
    const type = process.env.TYPE === "production" || process.env.TYPE === "sandbox" ? process.env.TYPE : "production";

    // Read from DB instead of filesystem
    const env: EbayEnvironment = type === "production" ? "PRODUCTION" : "SANDBOX";
    const tokenDoc = await IntegrationTokenModel.findOne({
      provider: "ebay",
      environment: env,
      useClient: false, // Always use application tokens for taxonomy APIs
    }).lean();

    // If no token found in DB, get application token automatically
    if (!tokenDoc) {
      console.log(`❌ No eBay application token found in DB for ${env}. Getting application token...`);

      // Validate credentials before attempting to get token
      if (!validateEbayCredentials(type)) {
        console.error(`❌ Invalid eBay ${type} credentials. Cannot get application token.`);
        return null;
      }

      // Get application token and store in DB
      const appToken = await getApplicationAuthToken(type);
      if (appToken?.access_token) {
        console.log("✅ Application token obtained and stored. Using it...");
        return appToken.access_token;
      } else {
        console.error("❌ Failed to get application token. Please verify your eBay credentials.");
        return null;
      }
    }

    const credentials: any = tokenDoc;

    const { access_token, generated_at, expires_in } = credentials;

    // Add detailed logging to debug the token structure
    console.log("🔍 Token document structure:", {
      hasAccessToken: !!access_token,
      hasGeneratedAt: !!generated_at,
      hasExpiresIn: !!expires_in,
      generatedAtType: typeof generated_at,
      expiresInType: typeof expires_in,
      accessTokenLength: access_token?.length || 0,
    });

    if (!access_token || !generated_at || !expires_in || isNaN(generated_at) || isNaN(expires_in)) {
      console.error("❌ Invalid or missing token fields. Clearing invalid token and getting new one...");

      // Clear the invalid token from DB
      await IntegrationTokenModel.deleteOne({
        provider: "ebay",
        environment: env,
        useClient: false,
      });

      // Get new application token
      const newToken = await getApplicationAuthToken(type);
      if (newToken?.access_token) {
        console.log("✅ New application token obtained and stored.");
        return newToken.access_token;
      } else {
        console.error("❌ Failed to get new application token");
        return null;
      }
    }

    const currentTime = Date.now();
    const expiresAt = generated_at + expires_in * 1000;
    const timeRemaining = expiresAt - currentTime;
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    // 🔁 Refresh token if it's expired or will expire soon
    if (timeRemaining <= bufferTime) {
      console.warn("⚠️ Access token is expired or about to expire. Refreshing...");
      const newToken = await refreshEbayAccessToken(type, "false"); // Always use application token
      if (newToken?.access_token) {
        console.log("✅ Token refreshed.");
        return newToken.access_token;
      } else {
        console.error("❌ Failed to refresh token.");
        return null;
      }
    }

    // Test the token with a simple API call to validate it
    const testUrl =
      type === "production"
        ? "https://api.ebay.com/commerce/taxonomy/v1/category_tree/0"
        : "https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/0";

    try {
      const testResponse = await fetch(testUrl, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/json",
        },
      });

      // If token is invalid (401), get a new one
      if (testResponse.status === 401) {
        console.log("🔄 Token is invalid, getting new application token...");

        // Clear the invalid token from DB
        await IntegrationTokenModel.deleteOne({
          provider: "ebay",
          environment: env,
          useClient: false,
        });

        // Get new application token
        const newToken = await getApplicationAuthToken(type);
        if (newToken?.access_token) {
          console.log("✅ New application token obtained and stored.");
          return newToken.access_token;
        } else {
          console.error("❌ Failed to get new application token");
          return null;
        }
      }
    } catch (error) {
      console.warn("⚠️ Could not validate token, using existing token:", error);
    }

    const isProduction = type === "production";
    console.log(`✅ [APPLICATION TOKEN - ${isProduction ? "PRODUCTION" : "SANDBOX"}] Access token is valid.`);
    return access_token;
  } catch (error) {
    console.error("❌ Unexpected error reading token:", error);
    return null;
  }
};

export const getEbayApplicationToken = async (type: "production" | "sandbox") => {
  // Get the new access token using the refresh token
  let token;
  if (type === "production") {
    console.log("🔵 [PRODUCTION] Getting application token for production");
    token = await ebayAuthToken.getApplicationToken("PRODUCTION");
  } else {
    console.log("🟣 [SANDBOX] Getting application token for sandbox");
    token = await ebayAuthTokenSandbox.getApplicationToken("SANDBOX");
  }

  if (!token) {
    console.log("Failed to get new access token");
    return null;
  }

  // Parse the new token and update DB
  const parsedToken: EbayToken = JSON.parse(token);

  // Store in DB
  const env: EbayEnvironment = type === "production" ? "PRODUCTION" : "SANDBOX";
  await IntegrationTokenModel.updateOne(
    { provider: "ebay", environment: env, useClient: false },
    { $set: { ...parsedToken, generated_at: Date.now() } },
    { upsert: true }
  );

  return parsedToken;
};

export const getNormalAccessToken = async () => {
  // Get the new access token using the refresh token
  const token = await ebayAuthToken.getApplicationToken("PRODUCTION");

  if (!token) {
    console.log("Failed to get new access token");
    return null;
  }

  // Parse the new token and update the ebay_tokens.json file
  const parsedToken: EbayToken = JSON.parse(token);

  return parsedToken;
};

export const refreshEbayAccessToken = async (type: "production" | "sandbox", useClient: "true" | "false") => {
  try {
    const env: EbayEnvironment = type === "production" ? "PRODUCTION" : "SANDBOX";

    // Always use application tokens for taxonomy APIs
    const tokenDoc = await IntegrationTokenModel.findOne({
      provider: "ebay",
      environment: env,
      useClient: false, // Always use application tokens
    });

    if (!tokenDoc) {
      console.log("No application token found in DB, getting new one...");
      return await getApplicationAuthToken(type);
    }

    const credentials: any = tokenDoc;

    // Check if the credentials are present
    if (!credentials) {
      return null;
    }

    // For application tokens, we need to get a new application token
    // since they don't have refresh tokens
    console.log("🔄 Refreshing application token...");
    return await getApplicationAuthToken(type);
  } catch (error) {
    console.error("❌ Error refreshing eBay access token:", error);
    return null;
  }
};

export const getEbayAuthURL = (type: "production" | "sandbox") => {
  if (type === "production") {
    console.log("🔵 [PRODUCTION] Generating production auth URL");
    return ebayAuthToken.generateUserAuthorizationUrl("PRODUCTION", scopes, options);
  } else {
    console.log("🟣 [SANDBOX] Generating sandbox auth URL");
    return ebayAuthTokenSandbox.generateUserAuthorizationUrl("SANDBOX", scopes, options);
  }
};

export const exchangeCodeForAccessToken = async (
  code: string,
  type: "production" | "sandbox",
  useClient: "true" | "false"
) => {
  if (type === "production") {
    const token = await ebayAuthToken.exchangeCodeForAccessToken("PRODUCTION", code);
    const parsedToken: EbayToken = JSON.parse(token);

    // Store in DB
    await IntegrationTokenModel.updateOne(
      { provider: "ebay", environment: "PRODUCTION", useClient: useClient === "true" ? true : false },
      { $set: { ...parsedToken, generated_at: Date.now() } },
      { upsert: true }
    );
    return parsedToken;
  } else {
    const token = await ebayAuthTokenSandbox.exchangeCodeForAccessToken("SANDBOX", code);
    const parsedToken: EbayToken = JSON.parse(token);
    await IntegrationTokenModel.updateOne(
      { provider: "ebay", environment: "SANDBOX", useClient: useClient === "true" ? true : false },
      { $set: { ...parsedToken, generated_at: Date.now() } },
      { upsert: true }
    );
    return parsedToken;
  }
};
