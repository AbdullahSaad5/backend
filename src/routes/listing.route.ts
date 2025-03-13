import { listingController } from "@/controllers";
import { listingValidation } from "@/validations";
import { Router } from "express";
import {
  handleBulkImport,
  handleBulkExport,
} from "@/controllers/product.controller.helper"; // Adjust import path as needed
import { uploadMiddleware } from "@/middlewares/multer.middleware";

export const product = (router: Router) => {
  // TODO: listingValidation.addProduct

  // Create or update a draft listing
  router.post("/", listingController.createDraftListing);
  router.patch(
    "/bulk-update-vat-and-discount",
    listingController.bulkUpdateListingTaxDiscount
  );
  //new route for search and filter and pagination
  router.get("/search", listingController.searchAndFilterListing);

  // New route for fetching product stats/ Widgets
  router.get("/stats", listingController.getListingStats);
  // Route for bulk import (POST request)
  router.post("/bulk-import", uploadMiddleware, handleBulkImport);

  // Route for bulk export (GET request)
  router.get("/bulk-export", handleBulkExport);

  router.get(
    "/transform/:id",
    listingValidation.validateId,
    listingController.transformAndSendListing
  );
  // Fetch transformed template listing by ID
  router.get(
    "/templates/:id",
    listingValidation.validateId,
    listingController.transformAndSendTemplateListing
  );
  router.get(
    "/drafts/:id",
    listingValidation.validateId,
    listingController.transformAndSendDraftListing
  );

  // Fetch all template product  names
  router.get("/templates", listingController.getAllTemplateListing);

  // Fetch all Draft product  names
  router.get("/drafts", listingController.getAllDraftListingNames);

  // Update a draft product by ID (subsequent steps)
  router.patch(
    "/:id",
    // listingValidation.updateListing,
    listingController.updateDraftListing
  );

  router.get("/", listingController.getAllListing);

  router.get(
    "/:id",
    listingValidation.validateId,
    listingController.getListingById
  );

  router.delete(
    "/:id",
    listingValidation.validateId,
    listingController.deleteListing
  );

  router.patch(
    "/:id",
    listingValidation.updateListing,
    listingController.updateListingById
  );

  // route for toggle block status
  router.patch("/block/:id", listingController.toggleBlock);

  // Upsert (Create or Update) selected variations
  router.post("/:id/selected-parts", listingController.upsertListingParts);

  // Get selected variations for a product
  router.get("/:id/selected-parts", listingController.getSelectedListingParts);
};
