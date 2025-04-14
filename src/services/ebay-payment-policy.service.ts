import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";

const baseURL = "https://api.ebay.com"; // Ensure this is correct for the eBay environment

export const ebayPaymentPolicyService = {
  async createPaymentPolicy(data: any) {
    try {
      console.log("📩 Received Payment Policy Data:", JSON.stringify(data, null, 2));

      if (!data.marketplaceId) throw new Error("❌ Missing required field: marketplaceId");

      const accessToken = await getStoredEbayAccessToken();

      // Check if the policy is for Motors category
      const isMotorsCategory = data.categoryTypes?.some((type: any) => type.name === "MOTORS_VEHICLES");

      // Define allowed payment methods
      const allowedPaymentMethods = isMotorsCategory
        ? ["CASH_ON_PICKUP", "CASHIER_CHECK", "MONEY_ORDER", "PERSONAL_CHECK"]
        : ["PAYPAL", "CREDIT_CARD", "DEBIT_CARD"];

      // Filter only valid payment methods
      const validPaymentMethods = (data.paymentMethods || []).filter((method: any) =>
        allowedPaymentMethods.includes(method.paymentMethodType)
      );

      const requestBody: any = {
        name: data.name,
        marketplaceId: data.marketplaceId,
        categoryTypes: data.categoryTypes?.map((type: any) => ({ name: type.name })) || [],
        paymentMethods: validPaymentMethods,
      };

      // Optional fields
      if (data.description) requestBody.description = data.description;
      if (typeof data.immediatePay === "boolean") requestBody.immediatePay = data.immediatePay;
      if (data.paymentInstructions) requestBody.paymentInstructions = data.paymentInstructions;

      // Include deposit info only if provided and valid for Motors
      if (isMotorsCategory && data.deposit?.amount?.value && data.deposit?.dueIn?.value) {
        requestBody.deposit = {
          amount: {
            currency: data.deposit.amount.currency || "USD",
            value: data.deposit.amount.value,
          },
          dueIn: {
            unit: data.deposit.dueIn.unit || "DAY",
            value: data.deposit.dueIn.value,
          },
          paymentMethods: data.deposit.paymentMethods || [],
        };
      }

      // Full payment due field (optional)
      if (data.fullPaymentDueIn?.value) {
        requestBody.fullPaymentDueIn = {
          unit: data.fullPaymentDueIn.unit || "DAY",
          value: data.fullPaymentDueIn.value,
        };
      }

      console.log("🚀 Sending Request to eBay API:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${baseURL}/sell/account/v1/payment_policy`, {
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
        // Check for duplicate policy
        if (result.errors?.[0]?.errorId === 20400) {
          const existingId = result.errors?.[0]?.parameters?.[0]?.value;
          console.warn("⚠️ Duplicate Payment Policy Found, Using Existing ID:", existingId);
          return {
            success: true,
            message: "Using existing payment policy",
            paymentPolicyId: existingId,
          };
        }

        console.error("⚠️ eBay API Error:", JSON.stringify(result, null, 2));
        throw new Error(result.errors?.[0]?.longMessage || result.errors?.[0]?.message || "eBay API call failed");
      }

      console.log("✅ Payment Policy Created Successfully:", result);
      return {
        success: true,
        policy: result,
      };
    } catch (error: any) {
      console.error("❌ Error creating eBay payment policy:", error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  },
  async getAllPaymentPolicies(_req: unknown, res: unknown) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(`${baseURL}/sell/account/v1/payment_policy?marketplace_id=EBAY_GB`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Error fetching eBay payment policies:", error);
      throw new Error("eBay API call failed");
    }
  },

  async deletePaymentPolicy(paymentPolicyId: string) {
    try {
      const accessToken = await getStoredEbayAccessToken();

      const response = await fetch(`${baseURL}/sell/account/v1/payment_policy/${paymentPolicyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const result = await response.json();
        console.error("❌ eBay Delete Policy Error:", JSON.stringify(result, null, 2));

        return {
          success: false,
          message: result.errors?.[0]?.longMessage || result.errors?.[0]?.message || "Failed to delete policy",
          ebayError: result,
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error("❌ Exception deleting eBay policy:", error);
      return {
        success: false,
        message: error.message || "eBay API call failed",
      };
    }
  },
  async editPaymentPolicy(paymentPolicyId: string, data: any) {
    try {
      const accessToken = await getStoredEbayAccessToken();

      const isMotorsCategory = data.categoryTypes?.some((type: any) => type.name === "MOTORS_VEHICLES");

      const allowedPaymentMethods = isMotorsCategory
        ? ["CASH_ON_PICKUP", "CASHIER_CHECK", "MONEY_ORDER", "PERSONAL_CHECK"]
        : ["PAYPAL", "CREDIT_CARD", "DEBIT_CARD"];

      const validPaymentMethods = (data.paymentMethods || []).filter((method: any) =>
        allowedPaymentMethods.includes(method.paymentMethodType)
      );

      const updatedData: any = {
        name: data.name,
        marketplaceId: data.marketplaceId,
        categoryTypes: data.categoryTypes?.map((type: any) => ({ name: type.name })) || [],
        paymentMethods: validPaymentMethods,
      };

      if (data.description) updatedData.description = data.description;
      if (typeof data.immediatePay === "boolean") updatedData.immediatePay = data.immediatePay;
      if (data.paymentInstructions) updatedData.paymentInstructions = data.paymentInstructions;

      if (isMotorsCategory && data.deposit?.amount?.value && data.deposit?.dueIn?.value) {
        updatedData.deposit = {
          amount: {
            currency: data.deposit.amount.currency || "USD",
            value: data.deposit.amount.value,
          },
          dueIn: {
            unit: data.deposit.dueIn.unit || "DAY",
            value: data.deposit.dueIn.value,
          },
          paymentMethods: data.deposit.paymentMethods || [],
        };
      }

      if (data.fullPaymentDueIn?.value) {
        updatedData.fullPaymentDueIn = {
          unit: data.fullPaymentDueIn.unit || "DAY",
          value: data.fullPaymentDueIn.value,
        };
      }

      const response = await fetch(`${baseURL}/sell/account/v1/payment_policy/${paymentPolicyId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const result = await response.json();

      // 🔍 Handle error cases with detailed messages
      if (!response.ok) {
        const error = result.errors?.[0];
        const message = error?.longMessage || error?.message || "eBay API call failed";
        console.error("⚠️ eBay API Error:", JSON.stringify(result, null, 2));

        return {
          success: false,
          status: response.status,
          message,
          ebayError: error,
        };
      }

      // ✅ Success case
      return {
        success: true,
        policy: result,
      };
    } catch (error: any) {
      console.error("❌ Error updating eBay payment policy:", error.message || error);
      return {
        success: false,
        message: error.message || "Something went wrong while updating payment policy",
      };
    }
  },
  async getById(paymentPolicyId: string) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      const response = await fetch(`${baseURL}/sell/account/v1/payment_policy/${paymentPolicyId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching eBay payment policy by ID:", error);
      throw new Error("eBay API call failed");
    }
  },
};
