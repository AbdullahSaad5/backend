import { listingController } from "@/controllers";
import { productValidation } from "@/validations";
import { Router } from "express";
import {
  handleBulkImport,
  handleBulkExport,
} from "@/controllers/product.controller.helper"; // Adjust import path as needed
import { uploadMiddleware } from "@/middlewares/multer.middleware";

export const product = (router: Router) => {
  // TODO: productValidation.addProduct

  // Create or update a draft product
  router.post("/", listingController.createDraftListing);
  router.patch(
    "/bulk-update-vat-and-discount",
    listingController.bulkUpdateProductTaxDiscount
  );
  //new route for search and filter and pagination
  router.get("/search", listingController.searchAndFilterProducts);

  // New route for fetching product stats/ Widgets
  router.get("/stats", listingController.getProductStats);
  // Route for bulk import (POST request)
  router.post("/bulk-import", uploadMiddleware, handleBulkImport);

  // Route for bulk export (GET request)
  router.get("/bulk-export", handleBulkExport);

  router.get(
    "/transform/:id",
    productValidation.validateId,
    listingController.transformAndSendProduct
  );
  // Fetch transformed template product by ID
  router.get(
    "/templates/:id",
    productValidation.validateId,
    listingController.transformAndSendTemplateProduct
  );
  router.get(
    "/drafts/:id",
    productValidation.validateId,
    listingController.transformAndSendDraftProduct
  );

  // Fetch all template product  names
  router.get("/templates", listingController.getAllTemplateProducts);

  // Fetch all Draft product  names
  router.get("/drafts", listingController.getAllDraftProductNames);

  // Update a draft product by ID (subsequent steps)
  router.patch(
    "/:id",
    // productValidation.updateProduct,
    listingController.updateDraftListing
  );

  router.get("/", listingController.getAllProduct);

  router.get(
    "/:id",
    productValidation.validateId,
    listingController.getProductById
  );

  router.delete(
    "/:id",
    productValidation.validateId,
    listingController.deleteProduct
  );

  router.patch(
    "/:id",
    productValidation.updateProduct,
    listingController.updateProductById
  );

  // route for toggle block status
  router.patch("/block/:id", listingController.toggleBlock);

  // Upsert (Create or Update) selected variations
  router.post("/:id/selected-parts", listingController.upsertProductParts);

  // Get selected variations for a product
  router.get("/:id/selected-parts", listingController.getSelectedProductParts);
};
