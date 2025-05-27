import { amazonListingService } from "@/services";
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
  router.get("/get-parsed-schema/:productType", amazonListingService.getParsedSchema);

  // Additional routes can be added here as needed
  // For example:
  // router.get("/inventory", amazonListingService.getInventory);
  // router.get("/reports", amazonListingService.getReports);
  // router.get("/fulfillment", amazonListingService.getFulfillmentOrders);
};
