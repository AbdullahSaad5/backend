import EbayAuthToken from "ebay-oauth-nodejs-client";
import fs from "fs";
import dotenv from "dotenv";
import { IntegrationTokenModel } from "@/models/integration-token.model";

// Configure dotenv to use .env file like .env.dev or .env.prod
dotenv.config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

type EbayEnvironment = "SANDBOX" | "PRODUCTION";

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

// Create a new instance of EbayAuthToken to be used for generating access token
const ebayAuthToken = new EbayAuthToken({
  clientId: process.env.EBAY_CLIENT_ID!,
  clientSecret: process.env.EBAY_CLIENT_SECRET!,
  redirectUri: process.env.EBAY_REDIRECT_URI!,
  baseUrl: "api.ebay.com",
  env: "PRODUCTION",
});

const ebayAuthTokenSandbox = new EbayAuthToken({
  clientId: process.env.EBAY_CLIENT_ID_SANDBOX!,
  clientSecret: process.env.EBAY_CLIENT_SECRET_SANDBOX!,
  redirectUri: process.env.EBAY_REDIRECT_URI_SANDBOX!,
  baseUrl: "api.sandbox.ebay.com",
  env: "SANDBOX",
});

// Options for generating user authorization URL
const options: EbayAuthOptions = { prompt: "consent" };

export const getStoredEbayAccessToken = async () => {
  try {
    const type = process.env.TYPE === "production" || process.env.TYPE === "sandbox" ? process.env.TYPE : "production";
    const useClient =
      process.env.USE_CLIENT === "true" || process.env.USE_CLIENT === "false" ? process.env.USE_CLIENT : "true";

    // Read from DB instead of filesystem
    const env: EbayEnvironment = type === "production" ? "PRODUCTION" : "SANDBOX";
    const tokenDoc = await IntegrationTokenModel.findOne({
      provider: "ebay",
      environment: env,
      useClient: useClient === "true" ? true : false,
    }).lean();
    if (!tokenDoc) {
      console.error("❌ No eBay token found in DB for", env, "useClient:", useClient);
      return null;
    }
    const credentials: any = tokenDoc;

    const { access_token, generated_at, expires_in } = credentials;

    if (!access_token || !generated_at || !expires_in || isNaN(generated_at) || isNaN(expires_in)) {
      console.error("❌ Invalid or missing token fields.");
      return null;
    }

    const currentTime = Date.now();
    const expiresAt = generated_at + expires_in * 1000;
    const timeRemaining = expiresAt - currentTime;
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    // 🔁 Refresh token if it's expired or will expire soon
    if (timeRemaining <= bufferTime) {
      console.warn("⚠️ Access token is expired or about to expire. Refreshing...");
      const newToken = await refreshEbayAccessToken(type, useClient);
      if (newToken?.access_token) {
        console.log("✅ Token refreshed.");
        return newToken.access_token;
      } else {
        console.error("❌ Failed to refresh token.");
        return null;
      }
    }

    const isClient = useClient === "true";
    const isProduction = type === "production";
    console.log(`✅ [${isClient ? "CLIENT" : isProduction ? "PRODUCTION" : "SANDBOX"}] Access token is valid.`);
    return access_token;
  } catch (error) {
    console.error("❌ Unexpected error reading token:", error);
    return null;
  }
};

export const getNormalAccessToken = async (type: "production" | "sandbox") => {
  // Get the new access token using the refresh token
  let token;
  if (type === "production") {
    console.log("🔵 [PRODUCTION] Getting application token for production");
    token = await ebayAuthToken.getApplicationToken("PRODUCTION");
  } else {
    console.log("🟣 [SANDBOX] Getting application token for sandbox");
    token = await ebayAuthToken.getApplicationToken("SANDBOX");
  }

  if (!token) {
    console.log("Failed to get new access token");
    return null;
  }

  // Parse the new token and update the ebay_tokens.json file
  const parsedToken: EbayToken = JSON.parse(token);

  return parsedToken;
};

// Add required scopes for your use case
export const refreshEbayAccessToken = async (type: "production" | "sandbox", useClient: "true" | "false") => {
  // Read token from DB
  const env: EbayEnvironment = type === "production" ? "PRODUCTION" : "SANDBOX";
  const tokenDoc = await IntegrationTokenModel.findOne({
    provider: "ebay",
    environment: env,
    useClient: useClient === "true" ? true : false,
  });
  const credentials: any = tokenDoc as any;

  // Check if the credentials are present
  if (!credentials) {
    return null;
  }

  // Extract the refresh token from the credentials
  const refreshToken = credentials.refresh_token;
  const isClient = useClient === "true";
  const isProduction = type === "production";
  console.log(`🔑 [${isClient ? "CLIENT" : isProduction ? "PRODUCTION" : "SANDBOX"}] refreshToken`, refreshToken);
  if (!refreshToken) {
    console.log(`🟦 [${isClient ? "CLIENT" : isProduction ? "PRODUCTION" : "SANDBOX"}] No refresh token found`);
    return null;
  }

  // Extract the refresh token expiry time from the credentials
  const refreshTokenExpiresAt = credentials.refresh_token_expires_in;
  const generatedAt = credentials.generated_at;
  if (!refreshTokenExpiresAt) {
    console.log(
      `🔑 [${isClient ? "CLIENT" : isProduction ? "PRODUCTION" : "SANDBOX"}] No refresh token expiry time found`
    );
    return null;
  }

  // Check if the refresh token has expired
  const currentTime = Date.now();
  console.log(`⏰ [${isClient ? "CLIENT" : isProduction ? "PRODUCTION" : "SANDBOX"}] Current time: `, currentTime);
  console.log(
    `⏰ [${isClient ? "CLIENT" : isProduction ? "PRODUCTION" : "SANDBOX"}] Refresh token expiry time: `,
    refreshTokenExpiresAt
  );
  if (currentTime - generatedAt > refreshTokenExpiresAt * 1000) {
    console.log("Refresh token has expired");
    return null;
  }

  // Get the new access token using the refresh token
  let token;
  if (useClient === "true") {
    console.log("🔑 [CLIENT] Getting access token for client");
    token = await ebayAuthToken.getAccessToken("PRODUCTION", refreshToken, scopes);
  } else {
    if (type === "production") {
      console.log("🔵 [PRODUCTION] Getting access token for production");
      token = await ebayAuthToken.getAccessToken("PRODUCTION", refreshToken, scopes);
    } else {
      console.log("🟣 [SANDBOX] Getting access token for sandbox");
      token = await ebayAuthTokenSandbox.getAccessToken("SANDBOX", refreshToken, scopes);
    }
  }
  if (!token) {
    console.log("Failed to get new access token");
    return null;
  }

  // Parse the new token and update DB
  const parsedToken: EbayToken = JSON.parse(token);
  await IntegrationTokenModel.updateOne(
    { provider: "ebay", environment: env, useClient: useClient === "true" ? true : false },
    { $set: { ...parsedToken, generated_at: Date.now() } },
    { upsert: true }
  );
  return parsedToken;
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
