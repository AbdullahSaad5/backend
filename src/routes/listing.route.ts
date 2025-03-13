import { listingController } from "@/controllers";
import { listingValidation } from "@/validations";
import { Router } from "express";
import {
  handleBulkImport,
  handleBulkExport,
} from "@/controllers/listing.controller.helper"; // Adjust import path as needed
import { uploadMiddleware } from "@/middlewares/multer.middleware";

export const listing = (router: Router) => {
  // TODO: listingValidation.addListing

  // Create or update a draft listing
  router.post("/", listingController.createDraftListing);
  router.patch(
    "/bulk-update-vat-and-discount",
    listingController.bulkUpdateListingTaxDiscount
  );
  //new route for search and filter and pagination
  router.get("/search", listingController.searchAndFilterListing);

  // New route for fetching listing stats/ Widgets
  router.get("/stats", listingController.getListingStats);
  // Route for bulk import (POST request)
  router.post("/bulk-import", uploadMiddleware, handleBulkImport);

  // Route for bulk export (GET request)
  router.get("/bulk-export", handleBulkExport);
//get all the listings by inventoryId
router.get("/inventory/:inventoryId", listingController.getListingsByInventoryId);

  router.get(
    "/transform/:id",
    listingValidation.validateId,
    listingController.transformAndSendListing
  );
  // Fetch transformed template listing by ID
  router.get(
    "/template/:id",
    listingValidation.validateId,
    listingController.transformAndSendTemplateListing
  );
  router.get(
    "/drafts/:id",
    listingValidation.validateId,
    listingController.transformAndSendDraftListing
  );

  // Fetch all template listing  names
  router.get("/templates", listingController.getAllTemplateListingNames);

  // Fetch all Draft listing  names
  router.get("/drafts", listingController.getAllDraftListingNames);

  // Update a draft listing by ID (subsequent steps)
  router.patch(
    "/:id",
    // listingValidation.updateListing,
    listingController.updateDraftListingController
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

  // Get selected variations for listing
  router.get("/:id/selected-parts", listingController.getSelectedListingParts);
};
