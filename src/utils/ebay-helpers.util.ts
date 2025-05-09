import EbayAuthToken from "ebay-oauth-nodejs-client";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { ref } from "@firebase/storage";

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

const ebayAuthTokenSandbox = new EbayAuthToken({
  clientId: process.env.EBAY_CLIENT_ID_SANDBOX!,
  clientSecret: process.env.EBAY_CLIENT_SECRET_SANDBOX!,
  redirectUri: process.env.EBAY_REDIRECT_URI_SANDBOX!,
});

// Options for generating user authorization URL
const options: EbayAuthOptions = { prompt: "consent" };

export const getStoredEbayAccessToken = async (type: "production" | "sandbox", useClient: "true" | "false") => {
  try {
    // const filePath = path.resolve(__dirname, "ebay_tokens.json");

    // // ✅ Check if file exists
    // if (!fs.existsSync(filePath)) {
    //   console.error("❌ Token file not found.");
    //   return null;
    // }

    let credentialsText;
    try {
      if (useClient === "true") {
        credentialsText = fs.readFileSync("ebay_tokens_client.json", "utf-8");
      } else {
        if (type === "production") {
          credentialsText = fs.readFileSync("ebay_tokens.json", "utf-8");
        } else {
          credentialsText = fs.readFileSync("ebay_tokens_sandbox.json", "utf-8");
        }
      }
    } catch (readError) {
      console.error("❌ Error reading token file:", readError);
      return null;
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsText);
    } catch (jsonError) {
      console.error("❌ Error parsing token JSON:", jsonError);
      return null;
    }

    if (!credentials || !credentials.access_token || !credentials.generated_at || !credentials.expires_in) {
      console.error("❌ Invalid token data in file.");
      return null;
    }

    const { access_token, generated_at, expires_in } = credentials;

    // 🔥 Fix: Ensure generated_at is a valid number
    if (isNaN(generated_at) || isNaN(expires_in)) {
      console.error("❌ Invalid 'generated_at' or 'expires_in' value.");
      return null;
    }

    const currentTime = Date.now();
    const expiresAt = generated_at + expires_in * 1000; // Expiration time in ms

    if (currentTime > expiresAt) {
      console.error("❌ Token expired.");
      // Refresh the token when expired
      const newToken = await refreshEbayAccessToken(type, useClient); // Call your function to refresh token
      if (newToken) {
        console.log("✅ Token refreshed.");
        return newToken; // Return the new token after refreshing
      }
      return null; // If refreshing fails, return null
    }

    console.log("✅ Access token is valid.");
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
    token = await ebayAuthToken.getApplicationToken("PRODUCTION");
  } else {
    token = await ebayAuthTokenSandbox.getApplicationToken("SANDBOX");
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
  // Read the ebay_tokens.json file and parse the content
  let credentialsText;
  if (useClient === "true") {
    credentialsText = fs.readFileSync("ebay_tokens_client.json", "utf-8");
  } else {
    if (type === "production") {
      credentialsText = fs.readFileSync("ebay_tokens.json", "utf-8");
    } else {
      credentialsText = fs.readFileSync("ebay_tokens_sandbox.json", "utf-8");
    }
  }
  const credentials = JSON.parse(credentialsText);

  // Check if the credentials are present
  if (!credentials) {
    return null;
  }

  // Extract the refresh token from the credentials
  const refreshToken = credentials.refresh_token;
  console.log("refreshToken", refreshToken);
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
  let token;
  if (useClient === "true") {
    token = await ebayAuthToken.getAccessToken("PRODUCTION", refreshToken, scopes);
  } else {
    if (type === "production") {
      token = await ebayAuthToken.getAccessToken("PRODUCTION", refreshToken, scopes);
    } else {
      token = await ebayAuthTokenSandbox.getAccessToken("SANDBOX", refreshToken, scopes);
    }
  }
  if (!token) {
    console.log("Failed to get new access token");
    return null;
  }

  // Parse the new token and update the ebay_tokens.json file
  const parsedToken: EbayToken = JSON.parse(token);
  if (useClient === "true") {
    fs.writeFileSync(
      "ebay_tokens_client.json",
      JSON.stringify({ ...credentials, ...parsedToken, generated_at: Date.now() }, null, 2)
    );
  } else {
    if (type === "production") {
      fs.writeFileSync(
        "ebay_tokens.json",
        JSON.stringify({ ...credentials, ...parsedToken, generated_at: Date.now() }, null, 2)
      );
    } else {
      fs.writeFileSync(
        "ebay_tokens_sandbox.json",
        JSON.stringify({ ...credentials, ...parsedToken, generated_at: Date.now() }, null, 2)
      );
    }
  }
  return parsedToken;
};

export const getEbayAuthURL = (type: "production" | "sandbox") => {
  if (type === "production") {
    return ebayAuthToken.generateUserAuthorizationUrl("PRODUCTION", scopes, options);
  } else {
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

    // Store in a file
    if (useClient === "true") {
      fs.writeFileSync(
        "ebay_tokens_client.json",
        JSON.stringify({ ...parsedToken, generated_at: Date.now() }, null, 2)
      );
    } else {
      fs.writeFileSync("ebay_tokens.json", JSON.stringify({ ...parsedToken, generated_at: Date.now() }, null, 2));
    }
    return parsedToken;
  } else {
    const token = await ebayAuthTokenSandbox.exchangeCodeForAccessToken("SANDBOX", code);
    const parsedToken: EbayToken = JSON.parse(token);
    fs.writeFileSync("ebay_tokens_sandbox.json", JSON.stringify({ ...parsedToken, generated_at: Date.now() }, null, 2));
    return parsedToken;
  }
};
