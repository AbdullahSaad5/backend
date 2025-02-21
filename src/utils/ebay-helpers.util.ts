import EbayAuthToken from "ebay-oauth-nodejs-client";
import fs from "fs";
import dotenv from "dotenv";

// Configure dotenv to use .env file like .env.dev or .env.prod
dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});

type EbayEnvironment = "SANDBOX" | "PRODUCTION";

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
};

type EbayAuthOptions = {
  prompt?: "login" | "consent";
  state?: string;
};

// All scopes required for the application
const scopes = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
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
});

// Options for generating user authorization URL
const options: EbayAuthOptions = {
  prompt: "consent",
};

export const getStoredEbayAccessToken = async () => {
  // Read the ebay_tokens.json file and parse the content
  const credentialsText = fs.readFileSync("../../ebay_tokens.json", "utf-8");
  const credentials = JSON.parse(credentialsText);

  // Check if the credentials are present
  if (!credentials) {
    return null;
  }

  // Extract the access token from the credentials
  const accessToken = credentials.access_token;
  if (!accessToken) {
    return null;
  }

  // Extract the generated_at and expires_in values from the credentials
  const generatedAt = credentials.generated_at;
  if (!generatedAt) {
    return null;
  }

  // Extract the expires_in value from the credentials
  const expiresIn = credentials.expires_in;
  if (!expiresIn) {
    return null;
  }

  // Check if the access token has expired
  const currentTime = Date.now();
  if (currentTime - generatedAt > expiresIn * 1000) {
    return null;
  }

  // Return the access token
  return accessToken;
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

export const refreshEbayAccessToken = async () => {
  // Read the ebay_tokens.json file and parse the content
  const credentialsText = fs.readFileSync("ebay_tokens.json", "utf-8");
  const credentials = JSON.parse(credentialsText);

  // Check if the credentials are present
  if (!credentials) {
    return null;
  }

  // Extract the refresh token from the credentials
  const refreshToken = credentials.refresh_token;
  if (!refreshToken) {
    console.log("No refresh token found");
    return null;
  }

  // Extract the refresh token expiry time from the credentials
  const refreshTokenExpiresAt = credentials.refresh_token_expires_in;
  const generatedAt = credentials.generated_at;
  if (!refreshTokenExpiresAt) {
    console.log("No refresh token expiry time found");
    return null;
  }

  // Check if the refresh token has expired
  const currentTime = Date.now();
  console.log("Current time: ", currentTime);
  console.log("Refresh token expiry time: ", refreshTokenExpiresAt);
  if (currentTime - generatedAt > refreshTokenExpiresAt * 1000) {
    console.log("Refresh token has expired");
    return null;
  }

  // Get the new access token using the refresh token
  const token = await ebayAuthToken.getAccessToken(
    "PRODUCTION",
    refreshToken,
    scopes
  );
  if (!token) {
    console.log("Failed to get new access token");
    return null;
  }

  // Parse the new token and update the ebay_tokens.json file
  const parsedToken: EbayToken = JSON.parse(token);
  fs.writeFileSync(
    "ebay_tokens.json",
    JSON.stringify(
      {
        ...credentials,
        ...parsedToken,
        generated_at: Date.now(),
      },
      null,
      2
    )
  );

  return parsedToken;
};

export const getEbayAuthURL = () => {
  return ebayAuthToken.generateUserAuthorizationUrl(
    "PRODUCTION",
    scopes,
    options
  );
};

export const exchangeCodeForAccessToken = async (code: string) => {
  const token = await ebayAuthToken.exchangeCodeForAccessToken(
    "PRODUCTION",
    code
  );
  const parsedToken: EbayToken = JSON.parse(token);

  // Store in a file
  fs.writeFileSync(
    "ebay_tokens.json",
    JSON.stringify({ ...parsedToken, generated_at: Date.now() }, null, 2)
  );
  return parsedToken;
};
