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

type EbayToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in?: number;
  token_type?: string;
};

type EbayAuthOptions = { prompt?: "login" | "consent"; state?: string };

// All scopes required for the application

const production_scopes = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.finances",
  "https://api.ebay.com/oauth/api_scope/sell.payment.dispute",
  "https://api.ebay.com/oauth/api_scope/sell.reputation",
  "https://api.ebay.com/oauth/api_scope/commerce.notification.subscription",
  "https://api.ebay.com/oauth/api_scope/sell.stores",
  "https://api.ebay.com/oauth/scope/sell.edelivery",
  "https://api.ebay.com/oauth/api_scope/commerce.vero",
];

const sandbox_scopes = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.finances",
  "https://api.ebay.com/oauth/api_scope/sell.payment.dispute",
  "https://api.ebay.com/oauth/api_scope/sell.reputation",
  "https://api.ebay.com/oauth/api_scope/commerce.notification.subscription",
  "https://api.ebay.com/oauth/api_scope/sell.stores",
  "https://api.ebay.com/oauth/api_scope/commerce.vero",
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
export const getApplicationAuthToken = async () => {
  try {
    const type =
      process.env.EBAY_TOKEN_ENV === "production" || process.env.EBAY_TOKEN_ENV === "sandbox"
        ? process.env.EBAY_TOKEN_ENV
        : "sandbox";

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
      {
        $set: {
          ...parsedToken,
          generated_at: Date.now(),
          token_type: "Application Access Token", // ✅ Mark as Application token
        },
      },
      { upsert: true }
    );

    console.log(`✅ eBay application token stored in DB for ${type}`);
    return parsedToken;
  } catch (error) {
    console.error(`❌ Failed to get eBay application token for`, error);
    return null;
  }
};

// Get Application Access Token for taxonomy/categories APIs
export const getStoredEbayApplicationToken = async () => {
  try {
    // Determine environment
    const type = process.env.EBAY_TOKEN_ENV === "production" ? "production" : "sandbox";
    const env: EbayEnvironment = type === "production" ? "PRODUCTION" : "SANDBOX";

    console.log(`🔍 Looking for eBay Application Access Token in ${env}...`);

    // Look for APPLICATION ACCESS TOKEN in DB
    const tokenDoc = await IntegrationTokenModel.findOne({
      provider: "ebay",
      environment: env,
      useClient: false, // ✅ APPLICATION TOKEN for taxonomy APIs
    }).lean();

    // If Application token found, validate and return it
    if (tokenDoc) {
      const { access_token, generated_at, expires_in } = tokenDoc as any;

      if (access_token && generated_at && expires_in) {
        const currentTime = Date.now();
        const expiresAt = generated_at + expires_in * 1000;
        const timeRemaining = expiresAt - currentTime;
        const bufferTime = 5 * 60 * 1000; // 5 minutes

        // If token is still valid, return it
        if (timeRemaining > bufferTime) {
          console.log(`✅ [${env}] Valid Application Access Token found`);
          return access_token;
        }

        console.log(`🔄 [${env}] Application token expired, getting new one...`);
      }

      // Invalid or expired token, delete it
      console.log(`❌ [${env}] Invalid/expired Application token, removing...`);
      await IntegrationTokenModel.deleteOne({
        provider: "ebay",
        environment: env,
        useClient: false,
      });
    }

    // No valid Application token found - get new one
    console.log(`❌ [${env}] No valid Application Access Token found. Getting new one...`);

    // Validate credentials
    if (!validateEbayCredentials(type)) {
      console.error(`❌ Invalid eBay ${type} credentials. Cannot get application token.`);
      return null;
    }

    // Get new application token
    const appToken = await getApplicationAuthToken();
    if (appToken?.access_token) {
      console.log(`✅ [${env}] New Application token obtained and stored`);
      return appToken.access_token;
    } else {
      console.error(`❌ [${env}] Failed to get new Application token`);
      return null;
    }
  } catch (error) {
    console.error("❌ Error in getStoredEbayApplicationToken:", error);
    return null;
  }
};

// SIMPLIFIED: Get User Access Token for listing operations
export const getStoredEbayAccessToken = async () => {
  try {
    // Determine environment
    const type = process.env.EBAY_TOKEN_ENV === "production" ? "production" : "sandbox";
    const env: EbayEnvironment = type === "production" ? "PRODUCTION" : "SANDBOX";

    console.log(`🔍 Looking for eBay User Access Token in ${env}...`);

    // Look for USER ACCESS TOKEN in DB
    const tokenDoc = await IntegrationTokenModel.findOne({
      provider: "ebay",
      environment: env,
      useClient: true, // ✅ USER TOKEN for listing operations
    }).lean();

    // If User token found, validate and return it
    if (tokenDoc) {
      const { access_token, generated_at, expires_in, refresh_token } = tokenDoc as any;

      if (access_token && generated_at && expires_in) {
        const currentTime = Date.now();
        const expiresAt = generated_at + expires_in * 1000;
        const timeRemaining = expiresAt - currentTime;
        const bufferTime = 5 * 60 * 1000; // 5 minutes

        // If token is still valid, return it
        if (timeRemaining > bufferTime) {
          console.log(`✅ [${env}] Valid User Access Token found`);
          return access_token;
        }

        // If token expired but has refresh token, try to refresh
        if (refresh_token) {
          console.log(`🔄 [${env}] Token expired, attempting refresh...`);
          const refreshed = await refreshUserToken(type, refresh_token);
          if (refreshed?.access_token) {
            console.log(`✅ [${env}] User token refreshed successfully`);
            return refreshed.access_token;
          }
        }

        // Token expired and no refresh token available
        console.log(`❌ [${env}] Token expired and no refresh token available`);
        await IntegrationTokenModel.deleteOne({
          provider: "ebay",
          environment: env,
          useClient: true,
        });
        return null;
      }

      // Invalid token data, delete it
      console.log(`❌ [${env}] Invalid User token data, removing...`);
      await IntegrationTokenModel.deleteOne({
        provider: "ebay",
        environment: env,
        useClient: true,
      });
    }

    // No User token found in DB
    console.log(`❌ [${env}] No User Access Token found in database`);
    return null;
  } catch (error) {
    console.error("❌ Error in getStoredEbayAccessToken:", error);
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
      return await getApplicationAuthToken();
    }

    const credentials: any = tokenDoc;

    // Check if the credentials are present
    if (!credentials) {
      return null;
    }

    // For application tokens, we need to get a new application token
    // since they don't have refresh tokens
    console.log("🔄 Refreshing application token...");
    return await getApplicationAuthToken();
  } catch (error) {
    console.error("❌ Error refreshing eBay access token:", error);
    return null;
  }
};

export const getEbayAuthURL = (type: "production" | "sandbox") => {
  if (type === "production") {
    console.log("🔵 [PRODUCTION] Generating production auth URL");
    return ebayAuthToken.generateUserAuthorizationUrl("PRODUCTION", production_scopes, options);
  } else {
    console.log("🟣 [SANDBOX] Generating sandbox auth URL");
    return ebayAuthTokenSandbox.generateUserAuthorizationUrl("SANDBOX", sandbox_scopes, options);
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
      {
        $set: {
          ...parsedToken,
          generated_at: Date.now(),
          token_type: useClient === "true" ? "User Access Token" : "Application Access Token",
        },
      },
      { upsert: true }
    );
    return parsedToken;
  } else {
    const token = await ebayAuthTokenSandbox.exchangeCodeForAccessToken("SANDBOX", code);
    const parsedToken: EbayToken = JSON.parse(token);
    await IntegrationTokenModel.updateOne(
      { provider: "ebay", environment: "SANDBOX", useClient: useClient === "true" ? true : false },
      {
        $set: {
          ...parsedToken,
          generated_at: Date.now(),
          token_type: useClient === "true" ? "User Access Token" : "Application Access Token",
        },
      },
      { upsert: true }
    );
    return parsedToken;
  }
};

// Helper function to refresh user token
const refreshUserToken = async (type: "production" | "sandbox", refreshToken: string) => {
  try {
    console.log(`🔄 Refreshing user token for ${type}...`);

    let newToken;
    if (type === "production") {
      if (!ebayAuthToken) {
        console.error("❌ eBay production auth instance not initialized");
        return null;
      }
      newToken = await ebayAuthToken.refreshUserAccessToken("PRODUCTION", refreshToken);
    } else {
      if (!ebayAuthTokenSandbox) {
        console.error("❌ eBay sandbox auth instance not initialized");
        return null;
      }
      newToken = await ebayAuthTokenSandbox.refreshUserAccessToken("SANDBOX", refreshToken);
    }

    if (!newToken) {
      console.error("❌ Failed to refresh user token");
      return null;
    }

    const parsedToken: EbayToken = JSON.parse(newToken);
    const env: EbayEnvironment = type === "production" ? "PRODUCTION" : "SANDBOX";

    // Update token in DB
    await IntegrationTokenModel.updateOne(
      { provider: "ebay", environment: env, useClient: true },
      {
        $set: {
          ...parsedToken,
          generated_at: Date.now(),
          token_type: "User Access Token",
        },
      },
      { upsert: true }
    );

    console.log(`✅ User token refreshed and stored for ${type}`);
    return parsedToken;
  } catch (error) {
    console.error("❌ Error refreshing user token:", error);
    return null;
  }
};
