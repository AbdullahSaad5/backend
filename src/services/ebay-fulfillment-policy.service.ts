import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";

const baseURL = "https://api.ebay.com"; // Ensure this is correct for the eBay environment

export const ebayFulfillmentPolicyService = {
  async createFulfillmentPolicy(data: any) {
    try {
      console.log(
        "📩 Received Fulfillment Policy Data:",
        JSON.stringify(data, null, 2)
      );

      if (!data.marketplaceId)
        throw new Error("❌ Missing required field: marketplaceId");

      const accessToken = await getStoredEbayAccessToken();
      // Determine if it's a Motors category
      const isMotorsCategory = data.categoryTypes.some(
        (type: any) => type.name === "MOTORS_VEHICLES"
      );

      // Allowed fulfillment methods based on category
      const allowedFulfillmentMethods = isMotorsCategory
        ? ["CASH_ON_PICKUP", "CASHIER_CHECK", "MONEY_ORDER", "PERSONAL_CHECK"]
        : ["CREDIT_CARD", "PAYPAL", "DEBIT_CARD"]; // Adjust based on eBay docs

      // Filter fulfillment methods
      const validFulfillmentMethods =
        data.fulfillmentMethods?.filter((method: any) =>
          allowedFulfillmentMethods.includes(method.fulfillmentMethodType)
        ) || [];
      const requestBody: any = {
        name: data.name,
        description: data.description || "",
        marketplaceId: data.marketplaceId,
        categoryTypes:
          data.categoryTypes?.map((type: any) => ({ name: type.name })) || [],
        immediatePay: data.immediatePay,
        fulfillmentMethods: data.fulfillmentMethods || [],
      };

      console.log(
        "🚀 Sending Request to eBay API:",
        JSON.stringify(requestBody, null, 2)
      );

      const response = await fetch(
        `${baseURL}/sell/account/v1/fulfillment_policy`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // Check if the error is due to a duplicate policy
        if (result.errors?.[0]?.errorId === 20400) {
          console.warn(
            "⚠️ Duplicate Fulfillment Policy Found, Using Existing Policy ID:",
            result.errors?.[0]?.parameters?.[0]?.value
          );
          return {
            message: "Using existing fulfillment policy",
            policyId: result.errors?.[0]?.parameters?.[0]?.value,
          };
        }

        console.error("⚠️ eBay API Error:", JSON.stringify(result, null, 2));
        throw new Error(result.errors?.[0]?.message || "eBay API call failed");
      }

      console.log("✅ Fulfillment Policy Created Successfully:", result);
      return result;
    } catch (error: any) {
      console.error("❌ Error creating eBay fulfillment policy:", error.message);
      throw new Error(error.message);
    }
  },
  async getAllFulfillmentPolicies(_req: unknown, res: unknown) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(
        `${baseURL}/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_GB`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching eBay fulfillment policies:", error);
      throw new Error("eBay API call failed");
    }
  },

  async deleteFulfillmentPolicy(policyId: string) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(
        `${baseURL}/sell/account/v1/fulfillment_policy/${policyId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );
      return response.ok;
    } catch (error) {
      console.error("Error deleting eBay fulfillment policy:", error);
      throw new Error("eBay API call failed");
    }
  },

  async editFulfillmentPolicy(policyId: string, data: any) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(
        `${baseURL}/sell/account/v1/fulfillment_policy/${policyId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error updating eBay fulfillment policy:", error);
      throw new Error("eBay API call failed");
    }
  },
};
