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
      useClient: false,
    };
  }
  // default to production
  return {
    clientId: process.env.SELLING_PARTNER_APP_CLIENT_ID_PROD!,
    clientSecret: process.env.SELLING_PARTNER_APP_CLIENT_SECRET_PROD!,
    redirectUri: "https://sellingpartnerapi-eu.amazon.com",
    marketplaceId: "A1F83G8C2ARO7P",
    sellerId: "ALTKAQGINRXND",
    useClient: true,
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
const { useClient } = getAmazonCredentials();
//TODO: fix i to correectly refresh the token after every five minutes, not on each requeust
export const getStoredAmazonAccessToken = async (): Promise<string | null> => {
  try {
    // Determine environment type strictly
    const envVal = process.env.AMAZON_TOKEN_ENV === "production" ? "PRODUCTION" : "SANDBOX";
    const tokenDoc = await IntegrationTokenModel.findOne({
      provider: "amazon",
      environment: envVal,
      useClient: useClient ? true : false,
    }).lean();
    if (!tokenDoc) {
      console.error("❌ No Amazon token found in DB for", envVal);
      return null;
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
          { provider: "amazon", environment: envVal, useClient: useClient ? true : false },
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
    useClient: useClient ? true : false,
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
    { provider: "amazon", environment: env, useClient: useClient ? true : false },
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
      { provider: "amazon", environment: type, useClient: useClient ? true : false },
      { $set: { ...token, generated_at: Date.now() } },
      { upsert: true }
    );

    return token;
  } catch (error) {
    console.error("❌ Error initializing Amazon credentials:", error);
    throw error;
  }
};
