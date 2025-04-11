import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";

const baseURL = "https://api.ebay.com"; // Ensure this is correct for the eBay environment

export const ebayReturnPolicyService = {
  async createReturnPolicy(data: any) {
    try {
      console.log("📩 Received Return Policy Data:", JSON.stringify(data, null, 2));

      // ✅ Validate required fields
      if (!data.marketplaceId) throw new Error("❌ Missing required field: marketplaceId");
      if (!data.returnPeriod) throw new Error("❌ Missing required field: returnPeriod");

      const accessToken = await getStoredEbayAccessToken();

      // ✅ Determine if the policy applies to Motors Vehicles
      const isMotorsCategory = data.categoryTypes?.some((type: any) => type.name === "MOTORS_VEHICLES");

      // ✅ Allowed return methods based on category
      const allowedReturnMethods = isMotorsCategory
        ? ["CASH_ON_PICKUP", "CASHIER_CHECK", "MONEY_ORDER", "PERSONAL_CHECK"]
        : ["CREDIT_CARD", "PAYPAL", "DEBIT_CARD"];

      // ✅ Validate return methods
      const validReturnMethods =
        data.returnMethods?.filter((method: any) => allowedReturnMethods.includes(method)) || [];

      // ✅ Construct API request payload
      const requestBody: any = {
        name: data.name,
        description: data.description || "",
        marketplaceId: data.marketplaceId,
        categoryTypes: data.categoryTypes?.map((type: any) => ({ name: type.name })) || [],
        returnMethods: validReturnMethods, // ✅ Ensure only valid methods are sent
        returnPeriod: data.returnPeriod, // ✅ Ensure returnPeriod is sent
        returnsAccepted: data.returnsAccepted,
        returnShippingCostPayer: data.returnShippingCostPayer,
      };

      console.log("🚀 Sending Request to eBay API:", JSON.stringify(requestBody, null, 2));

      // ✅ Send request to eBay API
      const response = await fetch(`${baseURL}/sell/account/v1/return_policy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("⚠️ eBay API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          errors: result.errors?.map((e: any) => ({
            errorId: e.errorId,
            domain: e.domain,
            category: e.category,
            message: e.message,
            input: e.parameters?.map((p: any) => `${p.name}: ${p.value}`) || [],
          })),
        });

        return {
          error: true,
          status: response.status,
          statusText: response.statusText,
          errors: result.errors?.map((e: any) => ({
            errorId: e.errorId,
            message: e.message,
            input: e.parameters?.map((p: any) => `${p.name}: ${p.value}`) || [],
          })),
        };
      }

      console.log("✅ Return Policy Created Successfully:", result);
      return result;
    } catch (error: any) {
      console.error("❌ Error creating eBay return policy:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        raw: error,
      });
      throw new Error(error.message);
    }
  },
  async getAllReturnPolicies() {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(`${baseURL}/sell/account/v1/return_policy?marketplace_id=EBAY_GB`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: true,
          status: response.status,
          errors: data.errors || [],
        };
      }

      return data;
    } catch (error: any) {
      console.error("❌ Error fetching eBay return policies:", error);
      return {
        error: true,
        message: error.message,
      };
    }
  },
  async getById(returnPolicyId: string) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(`${baseURL}/sell/account/v1/return_policy/${returnPolicyId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: true,
          status: response.status,
          errors: data.errors || [],
        };
      }

      return data;
    } catch (error: any) {
      console.error("❌ Error fetching eBay return policy by ID:", error);
      return {
        error: true,
        message: error.message,
      };
    }
  },
  async deleteReturnPolicy(policyId: string) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(`${baseURL}/sell/account/v1/return_policy/${policyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const result = await response.json();
        return {
          error: true,
          status: response.status,
          errors: result.errors || [],
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error("❌ Error deleting eBay return policy:", error);
      return {
        error: true,
        message: error.message,
      };
    }
  },
  async editReturnPolicy(policyId: string, data: any) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(`${baseURL}/sell/account/v1/return_policy/${policyId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          error: true,
          status: response.status,
          errors: result.errors || [],
        };
      }

      return result;
    } catch (error: any) {
      console.error("❌ Error updating eBay return policy:", error);
      return {
        error: true,
        message: error.message,
      };
    }
  },
};
