import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

// Configure dotenv to use .env file
dotenv.config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

type AmazonEnvironment = "PRODUCTION" | "SANDBOX";

type AmazonToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

type AmazonAuthOptions = {
  marketplaceId: string;
  sellerId: string;
  mwsAuthToken: string;
};

// Amazon API endpoints
const AMAZON_ENDPOINTS = {
  PRODUCTION: {
    auth: "https://api.amazon.com/auth/o2/token",
    sellingPartner: "https://sellingpartnerapi-na.amazon.com",
  },
  SANDBOX: {
    auth: "https://api.amazon.com/auth/o2/token",
    sellingPartner: "https://sandbox.sellingpartnerapi-eu.amazon.com",
  },
};

// Required scopes for Amazon Selling Partner API
const SCOPES = [
  "sellingpartnerapi::notifications",
  "sellingpartnerapi::migration",
  "sellingpartnerapi::catalog",
  "sellingpartnerapi::inventory",
  "sellingpartnerapi::orders",
  "sellingpartnerapi::reports",
  "sellingpartnerapi::finances",
];

export const getStoredAmazonAccessToken = async () => {
  try {
    const type = process.env.NODE_ENV === "production" ? "PRODUCTION" : "SANDBOX";
    const useClient =
      process.env.USE_CLIENT === "true" || process.env.USE_CLIENT === "false" ? process.env.USE_CLIENT : "true";
    const tokenFile = type === "PRODUCTION" ? "amazon_tokens.json" : "amazon_tokens_sandbox.json";
    let credentialsText;
    try {
      if (useClient === "true") {
        console.log("🔑 [CLIENT] Reading client token file");
        credentialsText = fs.readFileSync("amazon_tokens_client.json", "utf-8");
      } else {
        credentialsText = fs.readFileSync(
          type === "PRODUCTION" ? "amazon_tokens.json" : "amazon_tokens_sandbox.json",
          "utf-8"
        );
      }
    } catch (readError) {
      console.error("❌ Error reading token file:", readError);
      return null;
    }

    try {
      credentialsText = fs.readFileSync(tokenFile, "utf-8");
    } catch (readError) {
      console.error("❌ Error reading Amazon token file:", readError);
      return null;
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsText);
    } catch (jsonError) {
      console.error("❌ Error parsing Amazon token JSON:", jsonError);
      return null;
    }

    const { access_token, generated_at, expires_in } = credentials;

    if (!access_token || !generated_at || !expires_in) {
      console.error("❌ Invalid or missing Amazon token fields.");
      return null;
    }

    const currentTime = Date.now();
    const expiresAt = generated_at + expires_in * 1000;
    const timeRemaining = expiresAt - currentTime;
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (timeRemaining <= bufferTime) {
      console.warn("⚠️ Amazon access token is expired or about to expire. Refreshing...");
      const newToken = await refreshAmazonAccessToken(type);
      if (newToken?.access_token) {
        console.log("✅ Amazon token refreshed.");
        return newToken.access_token;
      } else {
        console.error("❌ Failed to refresh Amazon token.");
        return null;
      }
    }

    console.log(`✅ [${type}] Amazon access token is valid.`);
    return access_token;
  } catch (error) {
    console.error("❌ Unexpected error reading Amazon token:", error);
    return null;
  }
};

export const refreshAmazonAccessToken = async (type: AmazonEnvironment) => {
  try {
    const tokenFile = type === "PRODUCTION" ? "amazon_tokens.json" : "amazon_tokens_sandbox.json";
    console.log(`🔄 Refreshing token using file: ${tokenFile}`);

    const credentialsText = fs.readFileSync(tokenFile, "utf-8");
    const credentials = JSON.parse(credentialsText);

    console.log("🔍 Loaded credentials:", {
      hasRefreshToken: !!credentials.refresh_token,
      clientIdPresent: !!process.env.AMAZON_CLIENT_ID,
      clientSecretPresent: !!process.env.AMAZON_CLIENT_SECRET,
    });

    if (!credentials.refresh_token) {
      console.error("❌ No refresh token found in credentials");
      return null;
    }

    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", credentials.refresh_token);
    params.append("client_id", process.env.AMAZON_CLIENT_ID!);
    params.append("client_secret", process.env.AMAZON_CLIENT_SECRET!);

    const url = AMAZON_ENDPOINTS[type].auth;
    console.log(`📡 Sending POST to ${url} with params:`, params.toString());

    const response = await axios.post(url, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const newToken: AmazonToken = response.data;
    console.log("✅ Received new token from Amazon");

    // Save the new token
    fs.writeFileSync(
      tokenFile,
      JSON.stringify(
        {
          ...credentials,
          ...newToken,
          generated_at: Date.now(),
        },
        null,
        2
      )
    );

    console.log("💾 New token saved to file:", tokenFile);

    return newToken;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error("❌ Axios error while refreshing token:", {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        request: error.config?.url,
      });
    } else {
      console.error("❌ Unknown error during token refresh:", error);
    }
    return null;
  }
};

// Product Catalog Operations
export const getProductTypeDefinitions = async (productType: string) => {
  try {
    const accessToken = await getStoredAmazonAccessToken();
    if (!accessToken) throw new Error("No access token available");

    const response = await axios.get(
      `${AMAZON_ENDPOINTS.PRODUCTION.sellingPartner}/definitions/2020-09-01/productTypes/${productType}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-amz-access-token": accessToken,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("❌ Error getting product type definitions:", error);
    throw error;
  }
};

// Inventory Operations
export const updateInventory = async (sku: string, quantity: number) => {
  try {
    const accessToken = await getStoredAmazonAccessToken();
    if (!accessToken) throw new Error("No access token available");

    const response = await axios.put(
      `${AMAZON_ENDPOINTS.PRODUCTION.sellingPartner}/fba/inventory/v1/summaries`,
      {
        sku,
        quantity,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-amz-access-token": accessToken,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("❌ Error updating inventory:", error);
    throw error;
  }
};

// Product Operations
export const getProductDefinitions = async (productType: string) => {
  try {
    const accessToken = await getStoredAmazonAccessToken();
    if (!accessToken) throw new Error("No access token available");

    const response = await axios.get(
      `${AMAZON_ENDPOINTS.PRODUCTION.sellingPartner}/definitions/2020-09-01/productTypes/${productType}/definitions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-amz-access-token": accessToken,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("❌ Error getting product definitions:", error);
    throw error;
  }
};

// Initialize Amazon credentials
export const initializeAmazonCredentials = async (code: string, type: AmazonEnvironment) => {
  try {
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("client_id", process.env.AMAZON_CLIENT_ID!);
    params.append("client_secret", process.env.AMAZON_CLIENT_SECRET!);
    params.append("redirect_uri", process.env.AMAZON_REDIRECT_URI!);

    const response = await axios.post(AMAZON_ENDPOINTS[type].auth, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const token: AmazonToken = response.data;
    const tokenFile = type === "PRODUCTION" ? "amazon_tokens.json" : "amazon_tokens_sandbox.json";

    fs.writeFileSync(tokenFile, JSON.stringify({ ...token, generated_at: Date.now() }, null, 2));

    return token;
  } catch (error) {
    console.error("❌ Error initializing Amazon credentials:", error);
    throw error;
  }
};
