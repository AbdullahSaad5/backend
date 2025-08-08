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
const env = process.env.AMAZON_TOKEN_ENV === "production" ? "PRODUCTION" : "SANDBOX";
const sellingPartnerEndpoint = AMAZON_ENDPOINTS[env].sellingPartner;

`${sellingPartnerEndpoint}/some/api/path`;

export const getAmazonCredentials = () => {
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
    useClient: false, // Always use application tokens
  };
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

// Function to get Amazon application token and store in DB
export const getAmazonApplicationAuthToken = async () => {
  try {
    console.log("🔐 Getting Amazon application token...");

    const credentials = getAmazonCredentials();
    const envVal = process.env.AMAZON_TOKEN_ENV === "production" ? "PRODUCTION" : "SANDBOX";

    // Get application token using client credentials
    const response = await axios.post(
      AMAZON_ENDPOINTS[envVal].auth,
      {
        grant_type: "client_credentials",
        scope: SCOPES.join(" "),
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        auth: {
          username: credentials.clientId,
          password: credentials.clientSecret,
        },
      }
    );

    const tokenData = response.data;

    // Store in DB
    await IntegrationTokenModel.updateOne(
      { provider: "amazon", environment: envVal, useClient: false }, // Always use application tokens
      {
        $set: {
          access_token: tokenData.access_token,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          generated_at: Date.now(),
        },
      },
      { upsert: true }
    );

    console.log(`✅ Amazon application token stored in DB for ${envVal}`);
    return tokenData;
  } catch (error) {
    console.error("❌ Failed to get Amazon application token:", error);
    return null;
  }
};

//TODO: fix i to correectly refresh the token after every five minutes, not on each requeust
export const getStoredAmazonAccessToken = async (): Promise<string | null> => {
  try {
    // Determine environment type strictly
    const envVal = process.env.AMAZON_TOKEN_ENV === "production" ? "PRODUCTION" : "SANDBOX";
    const tokenDoc = await IntegrationTokenModel.findOne({
      provider: "amazon",
      environment: envVal,
      useClient: false,
    }).lean();

    // If no token found in DB, get application token automatically
    if (!tokenDoc) {
      console.log(`❌ No Amazon token found in DB for ${envVal}. Getting application token...`);

      // Get application token and store in DB
      const appToken = await getAmazonApplicationAuthToken();
      if (appToken?.access_token) {
        console.log("✅ Application token obtained and stored. Using it...");
        return appToken.access_token;
      } else {
        console.error("❌ Failed to get application token");
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
      console.warn("⚠️ Amazon access token is expired or about to expire. Refreshing...");

      // Refresh token
      const newToken = await refreshAmazonAccessToken(envVal);
      if (newToken?.access_token) {
        await IntegrationTokenModel.updateOne(
          { provider: "amazon", environment: envVal, useClient: false },
          {
            $set: {
              access_token: newToken.access_token,
              refresh_token: newToken.refresh_token,
              generated_at: Date.now(),
            },
          }
        );
        console.log("✅ Amazon token refreshed and saved in DB.");

        return newToken.access_token;
      } else {
        console.error("❌ Failed to refresh Amazon token.");
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
        console.log("🔄 Amazon token is invalid, getting new application token...");

        // Clear the invalid token from DB
        await IntegrationTokenModel.deleteOne({
          provider: "amazon",
          environment: envVal,
          useClient: false,
        });

        // Get new application token
        const newToken = await getAmazonApplicationAuthToken();
        if (newToken?.access_token) {
          console.log("✅ New Amazon application token obtained and stored.");
          return newToken.access_token;
        } else {
          console.error("❌ Failed to get new Amazon application token");
          return null;
        }
      }
    } catch (error: any) {
      // If it's a 401 error, handle it the same way
      if (error.response?.status === 401) {
        console.log("🔄 Amazon token is invalid, getting new application token...");

        // Clear the invalid token from DB
        await IntegrationTokenModel.deleteOne({
          provider: "amazon",
          environment: envVal,
          useClient: false,
        });

        // Get new application token
        const newToken = await getAmazonApplicationAuthToken();
        if (newToken?.access_token) {
          console.log("✅ New Amazon application token obtained and stored.");
          return newToken.access_token;
        } else {
          console.error("❌ Failed to get new Amazon application token");
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
  const { clientId, clientSecret } = getAmazonCredentials();
  const tokenDoc = await IntegrationTokenModel.findOne({
    provider: "amazon",
    environment: env,
    useClient: false,
  });
  const credentials: any = tokenDoc as any;

  if (!credentials.refresh_token) {
    console.error("❌ No refresh token found in credentials");
    return null;
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", credentials.refresh_token);
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
    { provider: "amazon", environment: env, useClient: false },
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

    const { clientId, clientSecret } = getAmazonCredentials();
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
