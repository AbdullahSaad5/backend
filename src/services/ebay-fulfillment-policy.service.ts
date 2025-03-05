import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";

const baseURL = "https://api.ebay.com"; // Ensure this is correct for the eBay environment

export const ebayFulfillmentPolicyService = {
  createEbayFulfillmentPolicy: async (data: any) => {
    try {
      console.log(
        "📩 Received Fulfillment Policy Data:",
        JSON.stringify(data, null, 2)
      );

      if (!data.marketplaceId)
        throw new Error("❌ Missing required field: marketplaceId");

      const accessToken = await getStoredEbayAccessToken();
      if (!accessToken)
        throw new Error("❌ Missing or invalid eBay access token");

      // ✅ Validate shipping data before making the request
      validateShippingServices(data.shippingOptions);

      const requestBody = {
        name: data.name,
        description: data.description || "",
        marketplaceId: data.marketplaceId,
        categoryTypes:
          data.categoryTypes?.map((type: any) => ({ name: type.name })) || [],
        immediatePay: data.immediatePay ?? false,
        fulfillmentMethods: data.fulfillmentMethods || [],
        pickupDropOff: data.pickupDropOff ?? false,
        localPickup: data.localPickup ?? false,
        handlingTime: {
          value: data.handlingTime?.value ?? 1,
          unit: data.handlingTime?.unit ?? "DAY",
        },
        globalShipping: data.globalShipping ?? false,
        freightShipping: data.freightShipping ?? false,
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
            shippingPromotionOffered: option.shippingPromotionOffered ?? false,
            insuranceOffered: option.insuranceOffered ?? false,
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
              sortOrder: service.sortOrder ?? 1,
              buyerResponsibleForShipping:
                service.buyerResponsibleForShipping ?? false,
              buyerResponsibleForPickup:
                service.buyerResponsibleForPickup ?? false,
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

        // ✅ Return Full Error Response for Debugging
        return {
          success: false,
          status: response.status,
          errors: result.errors || [{ message: "Unknown eBay API error" }],
        };
      }

      console.log(
        "✅ Fulfillment Policy Created Successfully:",
        JSON.stringify(result, null, 2)
      );
      return {
        success: true,
        fulfillmentPolicy: result,
      };
    } catch (error: any) {
      console.error(
        "❌ Error creating eBay fulfillment policy:",
        error.message
      );

      // ✅ Return Error in Correct Format
      return {
        success: false,
        status: 500,
        errors: [{ message: error.message }],
      };
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
function validateShippingServices(shippingOptions: any[]) {
  if (!shippingOptions || shippingOptions.length === 0) {
    throw new Error(
      "❌ Shipping options are missing. At least one is required."
    );
  }

  shippingOptions.forEach((option, index) => {
    if (!option.shippingServices || option.shippingServices.length === 0) {
      throw new Error(
        `❌ Shipping option ${index + 1} is missing shippingServices.`
      );
    }

    option.shippingServices.forEach((service: any, svcIndex: number) => {
      if (!service.shippingServiceCode) {
        throw new Error(
          `❌ Shipping service at index ${svcIndex + 1} is missing 'shippingServiceCode'.`
        );
      }
    });
  });
}
