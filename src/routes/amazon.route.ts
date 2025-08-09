import { amazonListingService } from "@/services";
import { listingController } from "@/controllers";
import { Router } from "express";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ReasonPhrases } from "http-status-codes";
import { getAmazonApplicationAuthToken } from "@/utils/amazon-helpers.util";

export const amazon = (router: Router) => {
  // Authentication routes
  router.get("/auth/initial", amazonListingService.getApplicationAuthToken);
  router.get("/auth/callback", amazonListingService.handleAuthorizationCallback);
  router.get("/auth/refresh-token", amazonListingService.handleRefreshToken);

  // Taxonomy/Category routes
  router.get("/get-amazon-categories", amazonListingService.getAmazonCategories);

  // Product routes
  router.post("/products/create", amazonListingService.addItemOnAmazon);
  router.patch("/products/update", amazonListingService.reviseItemOnAmazon);

  // Order routes
  router.get("/orders/get-orders", amazonListingService.getOrders);
  router.get("/get-actual-schema/:productType", amazonListingService.getAmazonSchema);
  router.get("/get-parsed-schema/:productType", amazonListingService.getAmazonSchemaDummy);
  router.get("/get-original-schema/:productType", amazonListingService.getAmazonSchemaOriginal);
  router.get("/check-amazon-listing-status/:sku", listingController.checkAmazonListingStatus);
  router.get("/get-item-from-amazon/:listingId", listingController.getItemFromAmazon);
  router.get("/get-all-items-from-amazon", listingController.getAllItemsFromAmazon);
  router.get("/check-amazon-submission-status/:submissionId", listingController.checkAmazonSubmissionStatus);

  // Add this new endpoint for getting application tokens
  router.get("/application-token", async (req: Request, res: Response) => {
    try {
      const credentials = await getAmazonApplicationAuthToken();

      if (!credentials) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: ReasonPhrases.INTERNAL_SERVER_ERROR,
          error: "Failed to get application token",
        });
      }

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: credentials,
      });
    } catch (error) {
      console.error("Error getting application token:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get application token",
        details: error,
      });
    }
  });

  // Additional routes can be added here as needed
  // For example:
  // router.get("/inventory", amazonListingService.getInventory);
  // router.get("/reports", amazonListingService.getReports);
  // router.get("/fulfillment", amazonListingService.getFulfillmentOrders);
};
