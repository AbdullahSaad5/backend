import { productController } from "@/controllers";
import { productValidation } from "@/validations";
import { Router } from "express";

export const product = (router: Router) => {
  // TODO: productValidation.addProduct
  // Create or update a draft product
  router.post("/", productController.createDraftProduct);
  //new route for search and filter and pagination
  router.get("/search", productController.searchAndFilterProducts);
  // New route for fetching product stats/ Widgets
  router.get("/stats", productController.getProductStats);

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

  // Fetch all template products
  router.get("/templates", productController.getAllTemplateProducts);

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
};
