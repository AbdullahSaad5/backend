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

      const requestBody: any = {
        name: data.name,
        description: data.description || "",
        marketplaceId: data.marketplaceId,
        categoryTypes:
          data.categoryTypes?.map((type: any) => ({ name: type.name })) || [],
        immediatePay: data.immediatePay,
        fulfillmentMethods: data.fulfillmentMethods || [],

        // ✅ Required Fields Added
        pickupDropOff: data.pickupDropOff ?? false, // Default false
        localPickup: data.localPickup ?? false, // Default false
        handlingTime: {
          value: data.handlingTime?.value ?? 1, // Default 1 day
          unit: data.handlingTime?.unit ?? "DAY",
        },
        globalShipping: data.globalShipping ?? false, // Default false
        freightShipping: data.freightShipping ?? false, // Default false

        shippingOptions:
          data.shippingOptions?.map((option: any) => ({
            costType: option.costType,
            optionType: option.optionType,
            packageHandlingCost: option.packageHandlingCost
              ? {
                  currency: option.packageHandlingCost.currency,
                  value: option.packageHandlingCost.value,
                }
              : undefined,
            shippingPromotionOffered: option.shippingPromotionOffered ?? false, // Required field
            insuranceOffered: option.insuranceOffered ?? false, // Required field
            shippingServices: option.shippingServices?.map((service: any) => ({
              freeShipping: service.freeShipping,
              shippingCarrierCode: service.shippingCarrierCode,
              shippingServiceCode: service.shippingServiceCode,
              shippingCost: service.shippingCost
                ? {
                    currency: service.shippingCost.currency,
                    value: service.shippingCost.value,
                  }
                : undefined,
              shipToLocations: service.shipToLocations,
              sortOrder: service.sortOrder ?? 1, // Required field
              buyerResponsibleForShipping:
                service.buyerResponsibleForShipping ?? false, // Required field
              buyerResponsibleForPickup:
                service.buyerResponsibleForPickup ?? false, // Required field
            })),
          })) || [],

        shipToLocations: data.shipToLocations || {},
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
        console.error("⚠️ eBay API Error:", JSON.stringify(result, null, 2));
        throw new Error(result.errors?.[0]?.message || "eBay API call failed");
      }

      console.log("✅ Fulfillment Policy Created Successfully:", result);
      return result;
    } catch (error: any) {
      console.error(
        "❌ Error creating eBay fulfillment policy:",
        error.message
      );
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
