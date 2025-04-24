import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";

const baseURL = "https://api.ebay.com"; // Ensure this is correct for the eBay environment

export const ebayReturnPolicyService = {
  async createReturnPolicy(data: any) {
    try {
      console.log("📩 Received Return Policy Data:", JSON.stringify(data, null, 2));

      if (!data.marketplaceId) throw new Error("❌ Missing required field: marketplaceId");
      if (!data.returnPeriod?.value) throw new Error("❌ Missing required field: returnPeriod");

      const accessToken = await getStoredEbayAccessToken();
      const isMotorsCategory = data.categoryTypes?.some((type: any) => type.name === "MOTORS_VEHICLES");

      const requestBody: any = {
        name: data.name,
        description: data.description || "",
        marketplaceId: data.marketplaceId,
        categoryTypes:
          data.categoryTypes?.map((type: any) => ({
            name: type.name,
            ...(typeof type.default === "boolean" ? { default: type.default } : {}),
          })) || [],
        returnPeriod: {
          unit: data.returnPeriod.unit || "DAY",
          value: data.returnPeriod.value,
        },
        returnsAccepted: data.returnsAccepted,
        returnShippingCostPayer: data.returnShippingCostPayer,
      };

      if (data.refundMethod) requestBody.refundMethod = data.refundMethod;
      if (data.returnMethod) requestBody.returnMethod = data.returnMethod;
      if (data.returnInstructions) requestBody.returnInstructions = data.returnInstructions;
      if (data.restockingFeePercentage) requestBody.restockingFeePercentage = data.restockingFeePercentage;
      if (typeof data.extendedHolidayReturnsOffered === "boolean") {
        requestBody.extendedHolidayReturnsOffered = data.extendedHolidayReturnsOffered;
      }

      if (data.internationalOverride) {
        requestBody.internationalOverride = {
          returnMethod: data.internationalOverride.returnMethod,
          returnPeriod: {
            unit: data.internationalOverride.returnPeriod.unit || "DAY",
            value: data.internationalOverride.returnPeriod.value,
          },
          returnsAccepted: data.internationalOverride.returnsAccepted,
          returnShippingCostPayer: data.internationalOverride.returnShippingCostPayer,
        };
      }

      console.log("🚀 Sending Request to eBay API:", JSON.stringify(requestBody, null, 2));

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

      // ✅ Build updated request body
      const requestBody: any = {
        name: data.name,
        description: data.description || "",
        marketplaceId: data.marketplaceId,
        categoryTypes:
          data.categoryTypes?.map((type: any) => ({
            name: type.name,
            ...(typeof type.default === "boolean" ? { default: type.default } : {}),
          })) || [],
        returnPeriod: {
          unit: data.returnPeriod.unit || "DAY",
          value: data.returnPeriod.value,
        },
        returnsAccepted: data.returnsAccepted,
        returnShippingCostPayer: data.returnShippingCostPayer,
      };

      if (data.refundMethod) requestBody.refundMethod = data.refundMethod;
      if (data.returnMethod) requestBody.returnMethod = data.returnMethod;
      if (data.returnInstructions) requestBody.returnInstructions = data.returnInstructions;
      if (data.restockingFeePercentage) requestBody.restockingFeePercentage = data.restockingFeePercentage;
      if (typeof data.extendedHolidayReturnsOffered === "boolean") {
        requestBody.extendedHolidayReturnsOffered = data.extendedHolidayReturnsOffered;
      }

      if (data.internationalOverride) {
        requestBody.internationalOverride = {
          returnMethod: data.internationalOverride.returnMethod,
          returnPeriod: {
            unit: data.internationalOverride.returnPeriod.unit || "DAY",
            value: data.internationalOverride.returnPeriod.value,
          },
          returnsAccepted: data.internationalOverride.returnsAccepted,
          returnShippingCostPayer: data.internationalOverride.returnShippingCostPayer,
        };
      }

      console.log("✏️ Editing Return Policy:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${baseURL}/sell/account/v1/return_policy/${policyId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("⚠️ eBay API Error on Update:", result);
        return {
          error: true,
          status: response.status,
          errors: result.errors || [],
        };
      }

      console.log("✅ Return Policy Updated Successfully:", result);
      return result;
    } catch (error: any) {
      console.error("❌ Error updating eBay return policy:", {
        message: error.message,
        stack: error.stack,
      });
      return {
        error: true,
        message: error.message,
      };
    }
  },
};
