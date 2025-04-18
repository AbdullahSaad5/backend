import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";

const baseURL = "https://api.ebay.com"; // Ensure this is correct for the eBay environment

export const ebayFulfillmentPolicyService = {
  createEbayFulfillmentPolicy: async (data: any) => {
    try {
      console.log("📩 Received Fulfillment Policy Data:", JSON.stringify(data, null, 2));

      if (!data.marketplaceId) throw new Error("❌ Missing required field: marketplaceId");

      const accessToken = await getStoredEbayAccessToken();
      if (!accessToken) throw new Error("❌ Missing or invalid eBay access token");

      // ✅ Validate shipping data before making the request
      validateShippingServices(data.shippingOptions);

      const requestBody: any = {
        name: data.name,
        description: data.description || "",
        marketplaceId: data.marketplaceId,
        categoryTypes: data.categoryTypes?.map((type: any) => ({ name: type.name })) || [],
        immediatePay: data.immediatePay ?? false,
        handlingTime: {
          value: data.handlingTime?.value ?? 1,
          unit: data.handlingTime?.unit ?? "DAY",
        },
      };

      // ⏬ Conditionally add fulfillmentMethods
      if (data.fulfillmentMethods?.length) {
        requestBody.fulfillmentMethods = data.fulfillmentMethods;
      }

      // ⏬ Conditionally add pickup options
      if (data.pickupDropOff) requestBody.pickupDropOff = true;
      if (data.localPickup) requestBody.localPickup = true;

      // ⏬ Global and Freight shipping
      if (data.globalShipping) requestBody.globalShipping = true;
      if (data.freightShipping) requestBody.freightShipping = true;

      // ⏬ Conditionally add shippingOptions
      if (Array.isArray(data.shippingOptions) && data.shippingOptions.length > 0) {
        requestBody.shippingOptions = data.shippingOptions.map((option: any) => {
          const formattedOption: any = {
            costType: option.costType,
            optionType: option.optionType,
          };

          if (option.packageHandlingCost) {
            formattedOption.packageHandlingCost = {
              currency: option.packageHandlingCost.currency,
              value: option.packageHandlingCost.value,
            };
          }

          if (option.insuranceOffered !== undefined) formattedOption.insuranceOffered = option.insuranceOffered;
          if (option.shippingPromotionOffered !== undefined)
            formattedOption.shippingPromotionOffered = option.shippingPromotionOffered;

          // Conditionally add shipping services
          if (Array.isArray(option.shippingServices)) {
            formattedOption.shippingServices = option.shippingServices.map((service: any) => {
              const formattedService: any = {
                freeShipping: service.freeShipping ?? false,
                shippingCarrierCode: service.shippingCarrierCode,
                shippingServiceCode: service.shippingServiceCode,
                sortOrder: service.sortOrder ?? 1,
              };

              if (service.shippingCost) {
                formattedService.shippingCost = {
                  currency: service.shippingCost.currency,
                  value: service.shippingCost.value,
                };
              }

              if (service.shipToLocations) {
                formattedService.shipToLocations = service.shipToLocations;
              }

              if (service.buyerResponsibleForShipping !== undefined)
                formattedService.buyerResponsibleForShipping = service.buyerResponsibleForShipping;
              if (service.buyerResponsibleForPickup !== undefined)
                formattedService.buyerResponsibleForPickup = service.buyerResponsibleForPickup;

              return formattedService;
            });
          }

          return formattedOption;
        });
      }

      // ⏬ Conditionally include shipToLocations if present
      if (data.shipToLocations) {
        requestBody.shipToLocations = data.shipToLocations;
      }

      console.log("🚀 Sending Request to eBay API:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${baseURL}/sell/account/v1/fulfillment_policy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      // ✅ Handle HTTP status codes
      if (response.status === 201) {
        console.log("✅ Fulfillment Policy Created Successfully:", JSON.stringify(result, null, 2));
        return { success: true, fulfillmentPolicy: result };
      }

      console.error("⚠️ eBay API Error:", JSON.stringify(result, null, 2));

      // ✅ Handle Specific eBay Error Codes
      const errorDetails = result.errors
        ?.map((error: any) => {
          switch (error.errorId) {
            case 20400:
              return `❌ Invalid request: ${error.longMessage || "Unknown issue"}`;
            case 20401:
              return `❌ Missing field: ${error.parameters?.[0]?.value || "Unknown field"}`;
            case 20402:
              return `❌ Invalid input: ${error.longMessage || "Check request format"}`;
            case 20403:
              return `❌ Invalid ${error.parameters?.[0]?.name}: ${error.longMessage}`;
            case 20500:
              return "❌ System error. Try again later.";
            case 20501:
              return "❌ Service unavailable. Try again in 24 hours.";
            default:
              return `⚠️ eBay API Error: ${error.message}`;
          }
        })
        .join("\n");

      return {
        success: false,
        status: response.status,
        errors: errorDetails || [{ message: "Unknown eBay API error" }],
      };
    } catch (error: any) {
      console.error("❌ Error creating eBay fulfillment policy:", error.message);

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
      const response = await fetch(`${baseURL}/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_GB`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Error fetching eBay fulfillment policies:", error);
      throw new Error("eBay API call failed");
    }
  },
  async getFulfillmentPolicyById(id: any) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(`${baseURL}/sell/account/v1/fulfillment_policy/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Error fetching eBay fulfillment policy by ID:", error);
      throw new Error("eBay API call failed");
    }
  },
  async deleteFulfillmentPolicy(policyId: string) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(`${baseURL}/sell/account/v1/fulfillment_policy/${policyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      return response.ok;
    } catch (error) {
      console.error("Error deleting eBay fulfillment policy:", error);
      throw new Error("eBay API call failed");
    }
  },
  //to get rateTables
  async getRateTables(marketplaceId: string = "EBAY_US") {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(`${baseURL}/sell/account/v1/rate_table?marketplace_id=${marketplaceId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!data.rateTables || data.rateTables.length === 0) {
        console.warn(`⚠️ No rate tables found for ${marketplaceId}`);
        return [];
      }

      // ✅ Filter only UK (GB) rate tables
      const gbRateTables = data.rateTables.filter((table: { countryCode: string }) => table.countryCode === "US");

      if (!gbRateTables.length) {
        console.warn("⚠️ No UK rate tables found, returning empty list.");
        return [];
      }

      console.log("✅ Retrieved UK eBay rate tables:", gbRateTables);
      return gbRateTables;
    } catch (error) {
      console.error("❌ Error fetching eBay rate tables:", error);
      throw new Error("Failed to fetch eBay rate tables");
    }
  },

  async editFulfillmentPolicy(policyId: string, data: any) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      if (!accessToken) throw new Error("Missing eBay access token");

      const updatedData: any = {
        ...data,
      };

      // ⏬ Conditionally include shippingOptions if present
      if (Array.isArray(data.shippingOptions)) {
        updatedData.shippingOptions = data.shippingOptions.map((option: any) => {
          const formattedOption: any = {
            costType: option.costType,
            optionType: option.optionType,
          };

          if (option.rateTableId !== undefined) {
            formattedOption.rateTableId = option.rateTableId || ""; // fallback to ""
          }

          if (option.packageHandlingCost) {
            formattedOption.packageHandlingCost = {
              currency: option.packageHandlingCost.currency,
              value: option.packageHandlingCost.value,
            };
          }

          if (option.shippingPromotionOffered !== undefined)
            formattedOption.shippingPromotionOffered = option.shippingPromotionOffered;

          if (option.insuranceOffered !== undefined) formattedOption.insuranceOffered = option.insuranceOffered;

          // ⏬ Conditionally map shippingServices
          if (Array.isArray(option.shippingServices)) {
            formattedOption.shippingServices = option.shippingServices.map((service: any) => {
              const formattedService: any = {
                shippingCarrierCode: service.shippingCarrierCode,
                shippingServiceCode: service.shippingServiceCode,
                freeShipping: service.freeShipping ?? false,
                sortOrder: service.sortOrder ?? 1,
              };

              if (service.shippingCost) {
                formattedService.shippingCost = {
                  currency: service.shippingCost.currency,
                  value: service.shippingCost.value,
                };
              }

              if (service.additionalShippingCost) {
                formattedService.additionalShippingCost = {
                  currency: service.additionalShippingCost.currency,
                  value: service.additionalShippingCost.value,
                };
              } else {
                formattedService.additionalShippingCost = { currency: "GBP", value: "0.00" };
              }

              if (service.surcharge) {
                formattedService.surcharge = {
                  currency: service.surcharge.currency,
                  value: service.surcharge.value,
                };
              } else {
                formattedService.surcharge = { currency: "GBP", value: "0.00" };
              }

              if (service.shipToLocations) {
                formattedService.shipToLocations = service.shipToLocations;
              }

              if (service.buyerResponsibleForShipping !== undefined) {
                formattedService.buyerResponsibleForShipping = service.buyerResponsibleForShipping;
              }

              if (service.buyerResponsibleForPickup !== undefined) {
                formattedService.buyerResponsibleForPickup = service.buyerResponsibleForPickup;
              }

              return formattedService;
            });
          }

          return formattedOption;
        });
      }

      const response = await fetch(`${baseURL}/sell/account/v1/fulfillment_policy/${policyId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("❌ Failed to update policy:", result);
      }

      return result;
    } catch (error: any) {
      console.error("❌ Error updating eBay fulfillment policy:", error.message);
      throw new Error("eBay API call failed");
    }
  },
};
function validateShippingServices(shippingOptions: any[]) {
  if (!shippingOptions || shippingOptions.length === 0) {
    throw new Error("❌ Shipping options are missing. At least one is required.");
  }

  shippingOptions.forEach((option, index) => {
    if (!option.shippingServices || option.shippingServices.length === 0) {
      throw new Error(`❌ Shipping option ${index + 1} is missing shippingServices.`);
    }

    option.shippingServices.forEach((service: any, svcIndex: number) => {
      if (!service.shippingServiceCode) {
        throw new Error(`❌ Shipping service at index ${svcIndex + 1} is missing 'shippingServiceCode'.`);
      }
    });
  });
}
