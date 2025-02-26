import { productController } from "@/controllers";
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
  router.post("/", productController.createDraftProduct);
  router.patch(
    "/bulk-update-vat-and-discount",
    productController.bulkUpdateProductTaxDiscount
  );
  //new route for search and filter and pagination
  router.get("/search", productController.searchAndFilterProducts);

  // New route for fetching product stats/ Widgets
  router.get("/stats", productController.getProductStats);
  // Route for bulk import (POST request)
  router.post("/bulk-import", uploadMiddleware, handleBulkImport);

  // Route for bulk export (GET request)
  router.get("/bulk-export", handleBulkExport);

  router.get(
    "/transform/:id",
    productValidation.validateId,
    productController.transformAndSendProduct
  );
  // Fetch transformed template product by ID
  router.get(
    "/templates/:id",
    productValidation.validateId,
    productController.transformAndSendTemplateProduct
  );
  router.get(
    "/drafts/:id",
    productValidation.validateId,
    productController.transformAndSendDraftProduct
  );

  // Fetch all template product  names
  router.get("/templates", productController.getAllTemplateProducts);

  // Fetch all Draft product  names
  router.get("/drafts", productController.getAllDraftProductNames);

  // Update a draft product by ID (subsequent steps)
  router.patch(
    "/:id",
    // productValidation.updateProduct,
    productController.updateDraftProduct
  );

  router.get("/", productController.getAllProduct);

  router.get(
    "/:id",
    productValidation.validateId,
    productController.getProductById
  );

  router.delete(
    "/:id",
    productValidation.validateId,
    productController.deleteProduct
  );

  router.patch(
    "/:id",
    productValidation.updateProduct,
    productController.updateProductById
  );

  // route for toggle block status
  router.patch("/block/:id", productController.toggleBlock);

  // Upsert (Create or Update) selected variations
  router.post("/:id/variations", productController.upsertProductVariations);

  // Get selected variations for a product
  router.get("/:id/variations", productController.getSelectedProductVariations);
};
