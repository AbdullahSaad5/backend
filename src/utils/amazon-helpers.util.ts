import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";
import { IntegrationTokenModel } from "@/models/integration-token.model";

// Configure dotenv to use .env file
dotenv.config({ path: `.env.${process.env.AMAZON_TOKEN_ENV || "dev"}` });

type AmazonEnvironment = "PRODUCTION" | "SANDBOX";
// const getAmazonEnvironment = (): AmazonEnvironment => {
//   return process.env.AMAZON_TOKEN_ENV === "production" ? "PRODUCTION" : "SANDBOX";
// };

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

// Helper function to get Amazon environment consistently
const getAmazonEnvironment = (): "PRODUCTION" | "SANDBOX" => {
  return process.env.AMAZON_TOKEN_ENV === "production" ? "PRODUCTION" : "SANDBOX";
};

// Amazon API endpoints
const AMAZON_ENDPOINTS = {
  PRODUCTION: {
    auth: "https://api.amazon.com/auth/o2/token",
    sellingPartner: "https://sellingpartnerapi-eu.amazon.com", // EU endpoint for UK marketplace
  },
  SANDBOX: {
    auth: "https://api.amazon.com/auth/o2/token",
    sellingPartner: "https://sandbox.sellingpartnerapi-eu.amazon.com",
  },
};

const sellingPartnerEndpoint = AMAZON_ENDPOINTS[getAmazonEnvironment()].sellingPartner;

// Validation function for Amazon credentials
const validateAmazonCredentials = () => {
  const envType = process.env.AMAZON_TOKEN_ENV;
  const requiredVars =
    envType === "sandbox"
      ? ["AMAZON_CLIENT_ID_SANDBOX", "AMAZON_CLIENT_SECRET_SANDBOX"]
      : ["SELLING_PARTNER_APP_CLIENT_ID_PROD", "SELLING_PARTNER_APP_CLIENT_SECRET_PROD"];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error(`❌ Missing Amazon ${envType || "production"} environment variables: ${missing.join(", ")}`);
    return false;
  }

  return true;
};

export const getAmazonCredentials = () => {
  if (!validateAmazonCredentials()) {
    return null;
  }

  if (process.env.AMAZON_TOKEN_ENV === "sandbox") {
    return {
      clientId: process.env.AMAZON_CLIENT_ID_SANDBOX!,
      clientSecret: process.env.AMAZON_CLIENT_SECRET_SANDBOX!,
      redirectUri: "https://sandbox.sellingpartnerapi-eu.amazon.com",
      marketplaceId: "A1F83G8C2ARO7P",
      sellerId: "A21DY98JS1BBQC",
      useClient: false, // Always use application tokens
    };
  }
  // default to production
  return {
    clientId: process.env.SELLING_PARTNER_APP_CLIENT_ID_PROD!,
    clientSecret: process.env.SELLING_PARTNER_APP_CLIENT_SECRET_PROD!,
    redirectUri: "https://sellingpartnerapi-eu.amazon.com",
    marketplaceId: "A1F83G8C2ARO7P",
    sellerId: "ALTKAQGINRXND",
    useClient: true, // Always use application tokens
  };
};

// Required scopes for Amazon Selling Partner API
// Amazon SP-API requires scope parameter for client credentials grant
// The correct scope format is: sellingpartnerapi::notifications
const SCOPES = ["sellingpartnerapi::definitions", "sellingpartnerapi::catalog"];

// Function to get Amazon access token using refresh token (same as your working project)
export const getAmazonAccessToken = async () => {
  try {
    console.log("🔐 Getting Amazon access token using refresh token...");

    // Validate credentials before attempting to get token
    if (!validateAmazonCredentials()) {
      console.error("❌ Invalid Amazon credentials. Please check your environment variables.");
      return null;
    }

    const credentials = getAmazonCredentials();
    if (!credentials) {
      console.error("❌ Failed to get Amazon credentials");
      return null;
    }

    const envVal = getAmazonEnvironment();

    // Get access token using refresh token (same as your working project)
    const refreshToken =
      envVal === "PRODUCTION" ? process.env.AMAZON_REFRESH_TOKEN_PROD : process.env.AMAZON_REFRESH_TOKEN_SANDBOX;

    if (!refreshToken) {
      console.error(`❌ No refresh token found for ${envVal} environment`);
      return null;
    }

    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);
    params.append("client_id", credentials.clientId);
    params.append("client_secret", credentials.clientSecret);

    console.log(`🔍 Using refresh token for ${envVal} environment`);

    const response = await axios.post(AMAZON_ENDPOINTS[envVal].auth, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const tokenData = response.data;

    // Store in DB with refresh token support
    await IntegrationTokenModel.updateOne(
      { provider: "amazon", environment: envVal, useClient: true }, // Use refresh token flow
      {
        $set: {
          access_token: tokenData.access_token,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          refresh_token: refreshToken,
          generated_at: Date.now(),
        },
      },
      { upsert: true }
    );

    console.log(`✅ Amazon access token stored in DB for ${envVal}`);
    return tokenData;
  } catch (error: any) {
    console.error("❌ Failed to get Amazon access token:", error.message);
    if (error.response?.data) {
      console.error(`❌ Amazon API Error:`, error.response.data);
    }
    return null;
  }
};

//TODO: fix i to correctly refresh the token after every five minutes, not on each requeust
export const getStoredAmazonAccessToken = async (): Promise<string | null> => {
  try {
    // Determine environment type strictly
    const envVal = getAmazonEnvironment();
    const tokenDoc = await IntegrationTokenModel.findOne({
      provider: "amazon",
      environment: envVal,
      useClient: true, // Use refresh token flow
    }).lean();

    // If no token found in DB, get access token automatically
    if (!tokenDoc) {
      console.log(`❌ No Amazon token found in DB for ${envVal}. Getting access token...`);

      // Validate credentials before attempting to get token
      if (!validateAmazonCredentials()) {
        console.error(`❌ Invalid Amazon credentials. Cannot get access token.`);
        return null;
      }

      // Get access token and store in DB
      const appToken = await getAmazonAccessToken();
      if (appToken?.access_token) {
        console.log("✅ Access token obtained and stored. Using it...");
        return appToken.access_token;
      } else {
        console.error("❌ Failed to get access token. Please verify your Amazon credentials.");
        return null;
      }
    }

    const credentials: any = tokenDoc;

    const { access_token, generated_at, expires_in, refresh_token } = credentials;

    if (!access_token || !generated_at || !expires_in) {
      console.error("❌ Invalid or missing Amazon token fields.");
      return null;
    }

    const currentTime = Date.now();
    const expiresAt = generated_at + expires_in * 1000;
    const timeRemaining = expiresAt - currentTime;
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (timeRemaining <= bufferTime) {
      console.warn("⚠️ Amazon access token is expired or about to expire. Refreshing token...");

      // Use refresh token to get new access token
      const newToken = await refreshAmazonAccessToken(envVal);
      if (newToken?.access_token) {
        console.log("✅ Amazon access token refreshed and stored.");
        return newToken.access_token;
      } else {
        console.error("❌ Failed to refresh Amazon access token.");
        return null;
      }
    }

    // Test the token with a simple API call to validate it
    const testUrl =
      envVal === "PRODUCTION"
        ? "https://sellingpartnerapi-na.amazon.com/catalog/v0/items"
        : "https://sandbox.sellingpartnerapi-eu.amazon.com/catalog/v0/items";

    try {
      const testResponse = await axios.get(testUrl, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/json",
        },
        params: {
          identifiers: "test",
          identifiersType: "ASIN",
          marketplaceIds: "A1F83G8C2ARO7P",
        },
      });

      // If token is invalid (401), get a new one
      if (testResponse.status === 401) {
        console.log("🔄 Amazon token is invalid, getting new access token...");

        // Clear the invalid token from DB
        await IntegrationTokenModel.deleteOne({
          provider: "amazon",
          environment: envVal,
          useClient: true, // Use refresh token flow
        });

        // Get new access token using refresh token
        const newToken = await getAmazonAccessToken();
        if (newToken?.access_token) {
          console.log("✅ New Amazon access token obtained and stored.");
          return newToken.access_token;
        } else {
          console.error("❌ Failed to get new Amazon access token");
          return null;
        }
      }
    } catch (error: any) {
      // If it's a 401 error, handle it the same way
      if (error.response?.status === 401) {
        console.log("🔄 Amazon token is invalid, getting new access token...");

        // Clear the invalid token from DB
        await IntegrationTokenModel.deleteOne({
          provider: "amazon",
          environment: envVal,
          useClient: true, // Use refresh token flow
        });

        // Get new access token using refresh token
        const newToken = await getAmazonAccessToken();
        if (newToken?.access_token) {
          console.log("✅ New Amazon access token obtained and stored.");
          return newToken.access_token;
        } else {
          console.error("❌ Failed to get new Amazon access token");
          return null;
        }
      } else {
        console.warn("⚠️ Could not validate Amazon token, using existing token:", error.message);
      }
    }

    console.log(`✅ [${envVal}] Amazon access token is valid.`);
    return access_token;
  } catch (error) {
    console.error("❌ Unexpected error reading Amazon token:", error);
    return null;
  }
};

export const refreshAmazonAccessToken = async (env: "PRODUCTION" | "SANDBOX") => {
  // Validate credentials before attempting refresh
  if (!validateAmazonCredentials()) {
    console.error("❌ Invalid Amazon credentials. Cannot refresh token.");
    return null;
  }

  const credentials = getAmazonCredentials();
  if (!credentials) {
    console.error("❌ Failed to get Amazon credentials for refresh");
    return null;
  }

  const { clientId, clientSecret } = credentials;
  const tokenDoc = await IntegrationTokenModel.findOne({
    provider: "amazon",
    environment: env,
    useClient: true, // Use refresh token flow
  });
  const tokenCredentials: any = tokenDoc as any;

  if (!tokenCredentials?.refresh_token) {
    console.error("❌ No refresh token found in credentials");
    return null;
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", tokenCredentials.refresh_token);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  const url = AMAZON_ENDPOINTS[env].auth;

  const response = await axios.post(url, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const newToken: AmazonToken = response.data;
  await IntegrationTokenModel.updateOne(
    { provider: "amazon", environment: env, useClient: true }, // Use refresh token flow
    { $set: { ...newToken, generated_at: Date.now() } },
    { upsert: true }
  );
  return newToken;
};

// Product Catalog Operations
export const getProductTypeDefinitions = async (productType: string) => {
  try {
    const accessToken = await getStoredAmazonAccessToken();
    if (!accessToken) throw new Error("No access token available");

    const response = await axios.get(`${sellingPartnerEndpoint}/definitions/2020-09-01/productTypes/${productType}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-amz-access-token": accessToken,
      },
    });

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
      `${sellingPartnerEndpoint}/fba/inventory/v1/summaries`,
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
      `${sellingPartnerEndpoint}/definitions/2020-09-01/productTypes/${productType}/definitions`,
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
    // params.append("client_id", process.env.AMAZON_CLIENT_ID!);
    // params.append("client_secret", process.env.AMAZON_CLIENT_SECRET!);
    // params.append("redirect_uri", process.env.AMAZON_REDIRECT_URI!);

    const { clientId, clientSecret }: any = getAmazonCredentials();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);

    params.append("redirect_uri", process.env.AMAZON_REDIRECT_URI!);

    const response = await axios.post(AMAZON_ENDPOINTS[type].auth, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const token: AmazonToken = response.data;
    await IntegrationTokenModel.updateOne(
      { provider: "amazon", environment: type, useClient: false },
      { $set: { ...token, generated_at: Date.now() } },
      { upsert: true }
    );

    return token;
  } catch (error) {
    console.error("❌ Error initializing Amazon credentials:", error);
    throw error;
  }
};
