import { listingController } from "@/controllers";
import { listingValidation } from "@/validations";
import { Router } from "express";
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
  router.get("/get-seller-list", listingController.getSellerList);
  router.get("/get-category-features", listingController.getCategoryFeatures);
  router.get(
    "/get-category-sub-tree/:id",
    listingController.transformAndSendDraftListing
  );
  // New route for fetching listing stats/ Widgets
  router.get("/stats", listingController.getListingStats);

  //get all the listings by inventoryId
  router.get(
    "/inventory/:inventoryId",
    listingController.getListingsByInventoryId
  );

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

  router.delete("/bulk-delete", listingController.bulkDeleteListing);
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

  // route for toggle block status
  router.patch("/istemplate/:id", listingController.toggleIsTemplate);

  // route for toggle featured status
  router.patch("/isfeatured/:id", listingController.toggleIsFeatured);

  // Upsert (Create or Update) selected variations
  router.post("/:id/selected-parts", listingController.upsertListingParts);

  router.get("/:id/get-all-attributes", listingController.getAllAttributesById);
  // Get selected variations for listing
  router.get("/:id/selected-parts", listingController.getSelectedListingParts);



  
  // website routes
  // Fetch all Website listings
  router.get("/website", listingController.getWebsiteListings);

  // Fetch single Website product by ID
  router.get(
    "/website/:id",
    listingValidation.validateId,
    listingController.getWebsiteProductById
  );
};
