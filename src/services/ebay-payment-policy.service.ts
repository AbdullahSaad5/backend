import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";
import { parseEbayError } from "@/utils/parseEbayErrors.utils";

const baseURL = "https://api.ebay.com";

export const ebayPaymentPolicyService = {
  async createPaymentPolicy(data: any) {
    try {
      if (!data.marketplaceId) throw new Error("❌ Missing required field: marketplaceId");
      const accessToken = await getStoredEbayAccessToken();

      const isMotorsCategory = data.categoryTypes?.some((type: any) => type.name === "MOTORS_VEHICLES");

      const allowedPaymentMethods = isMotorsCategory
        ? ["CASH_ON_PICKUP", "CASHIER_CHECK", "MONEY_ORDER", "PERSONAL_CHECK"]
        : ["PAYPAL", "CREDIT_CARD", "DEBIT_CARD"];

      const validPaymentMethods = (data.paymentMethods || []).filter((method: any) =>
        allowedPaymentMethods.includes(method.paymentMethodType)
      );

      const requestBody: any = {
        name: data.name,
        marketplaceId: data.marketplaceId,
        categoryTypes: data.categoryTypes?.map((type: any) => ({ name: type.name })) || [],
        paymentMethods: validPaymentMethods,
      };

      if (data.description) requestBody.description = data.description;
      if (typeof data.immediatePay === "boolean") requestBody.immediatePay = data.immediatePay;
      if (data.paymentInstructions) requestBody.paymentInstructions = data.paymentInstructions;

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

      if (data.fullPaymentDueIn?.value) {
        requestBody.fullPaymentDueIn = {
          unit: data.fullPaymentDueIn.unit || "DAY",
          value: data.fullPaymentDueIn.value,
        };
      }

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
        if (result.errors?.[0]?.errorId === 20400) {
          const existingId = result.errors?.[0]?.parameters?.[0]?.value;
          return {
            success: true,
            message: "Using existing payment policy",
            paymentPolicyId: existingId,
          };
        }

        return {
          success: false,
          message: parseEbayError(result),
          ebayError: result,
        };
      }

      return {
        success: true,
        policy: result,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Something went wrong while creating policy",
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
        return {
          success: false,
          message: parseEbayError(result),
          ebayError: result,
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "eBay API call failed",
      };
    }
  },

  async editPaymentPolicy(paymentPolicyId: string, data: any) {
    try {
      const accessToken = await getStoredEbayAccessToken();
      console.log("📩 Editing payment policy:", paymentPolicyId);

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

      if (!response.ok) {
        // Handle Duplicate Policy Error
        if (result.errors?.[0]?.errorId === 20400 && result.errors[0]?.longMessage === "Duplicate Policy") {
          return {
            success: false,
            status: response.status,
            message: `Duplicate policy detected. Policy ID: ${result.errors[0].parameters[0].value}`,
          };
        }

        // Other eBay errors
        return {
          success: false,
          status: response.status,
          message: parseEbayError(result),
          ebayError: result,
        };
      }

      return {
        success: true,
        policy: result,
      };
    } catch (error: any) {
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
      throw new Error("eBay API call failed");
    }
  },
};
