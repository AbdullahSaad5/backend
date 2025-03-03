import { Request, Response } from "express";
import fetch from "node-fetch";
import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

const baseURL = "https://api.ebay.com"; // Replace with actual base URL if different

export const ebayCustomPolicyService = {
  async createCustomPolicy(body: any): Promise<any> {
    try {
      const accessToken = await getStoredEbayAccessToken();

      const response = await fetch(`${baseURL}/sell/account/v1/custom_policy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Language": "en-US",
          "Accept-Language": "en-US",
        },
        body: JSON.stringify(body),
      });

      // ✅ Read response as text first
      const text = await response.text();
      let data;

      // ✅ Parse JSON only if response is not empty
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (jsonError) {
          console.error("Failed to parse eBay response as JSON:", text);
          throw {
            status: response.status,
            statusText: response.statusText,
            message: "Invalid JSON response from eBay",
          };
        }
      }

      // ✅ Handle non-200 responses properly
      if (!response.ok) {
        throw {
          status: response.status,
          statusText: response.statusText,
          data,
        };
      }

      return {
        status: response.status,
        statusText: response.statusText,
        message: "Policy created successfully on eBay",
        data,
      };
    } catch (error: any) {
      console.error("Error creating eBay custom policy:", error);

      throw {
        status: error.status || StatusCodes.INTERNAL_SERVER_ERROR,
        message: error.message || ReasonPhrases.INTERNAL_SERVER_ERROR,
        details: error,
      };
    }
  },

  async getAllCustomPolicies(): Promise<any> {
    try {
      const accessToken = await getStoredEbayAccessToken();

      const response = await fetch(`${baseURL}/sell/account/v1/custom_policy`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Language": "en-US",
          "Accept-Language": "en-US",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw {
          status: response.status,
          statusText: response.statusText,
          data,
        };
      }
      return { status: response.status, statusText: response.statusText, data };
    } catch (error) {
      console.error("Error fetching eBay custom policies:", error);
      throw {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error,
      };
    }
  },

  async updateCustomPolicy(policyId: string, body: any): Promise<any> {
    try {
      const accessToken = await getStoredEbayAccessToken();

      const response = await fetch(
        `${baseURL}/sell/account/v1/custom_policy/${policyId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "Content-Language": "en-US",
            "Accept-Language": "en-US",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw {
          status: response.status,
          statusText: response.statusText,
          data,
        };
      }
      return {
        status: response.status,
        statusText: response.statusText,
        message: "Policy updated successfully on Ebay",
      };
    } catch (error) {
      console.error("Error updating eBay custom policy:", error);
      throw {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error,
      };
    }
  },
};
