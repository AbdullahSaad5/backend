import { amazonListingService } from "@/services";
import { listingController } from "@/controllers";
import { Router } from "express";

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
  // router.get("/get-parsed-schema/:productType", amazonListingService.getAmazonSchema);
  router.get("/get-parsed-schema/:productType", amazonListingService.getAmazonSchemaDummy);
  router.get("/get-original-schema/:productType", amazonListingService.getAmazonSchemaOriginal);
  router.get("/check-amazon-listing-status/:sku", listingController.checkAmazonListingStatus);
  router.get("/check-amazon-submission-status/:submissionId", listingController.checkAmazonSubmissionStatus);

  // Additional routes can be added here as needed
  // For example:
  // router.get("/inventory", amazonListingService.getInventory);
  // router.get("/reports", amazonListingService.getReports);
  // router.get("/fulfillment", amazonListingService.getFulfillmentOrders);
};
