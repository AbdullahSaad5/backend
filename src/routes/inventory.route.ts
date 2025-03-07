import { inventoryController } from "@/controllers";
import { inventoryValidation } from "@/validations";
import { Router } from "express";
import { handleBulkImport, handleBulkExport } from "@/controllers/product.controller.helper"; // Adjust import path as needed
import { uploadMiddleware } from "@/middlewares/multer.middleware";

export const inventory = (router: Router) => {
  // TODO: inventoryValidation.addInventory

  // Create or update a draft inventory
  router.post("/", inventoryController.createDraftInventory);
  router.patch(
    "/:id",
    // inventoryValidation.updateInventory,
    inventoryController.updateDraftInventory
  );

  router.patch("/bulk-update-vat-and-discount", inventoryController.bulkUpdateInventoryTaxDiscount);
  //new route for search and filter and pagination
  router.get("/search", inventoryController.searchAndFilterInventory);

  // New route for fetching inventory stats/ Widgets
  router.get("/stats", inventoryController.getInventoryStats);
  // Route for bulk import (POST request)
  router.post("/bulk-import", uploadMiddleware, handleBulkImport);

  // Route for bulk export (GET request)
  router.get("/bulk-export", handleBulkExport);

  router.get("/transform/:id", inventoryValidation.validateId, inventoryController.transformAndSendInventory);
  // Fetch transformed template inventory by ID
  router.get("/templates/:id", inventoryValidation.validateId, inventoryController.transformAndSendTemplateInventory);
  router.get("/drafts/:id", inventoryValidation.validateId, inventoryController.transformAndSendDraftInventory);

  // Fetch all template inventory  names
  router.get("/templates", inventoryController.getAllTemplateInventory);

  // Fetch all Draft inventory  names
  router.get("/drafts", inventoryController.getAllDraftInventoryNames);

  // Update a draft inventory by ID (subsequent steps)


  router.get("/", inventoryController.getAllInventory);

  router.get("/:id", inventoryValidation.validateId, inventoryController.getInventoryById);

  router.delete("/:id", inventoryValidation.validateId, inventoryController.deleteInventory);

  router.patch("/:id", inventoryValidation.updateInventory, inventoryController.updateInventoryById);

  // route for toggle block status
  router.patch("/block/:id", inventoryController.toggleBlock);

  // Upsert (Create or Update) selected variations
  router.post("/:id/selected-parts", inventoryController.upsertInventoryParts);

  // Get selected variations for a inventory
  router.get("/:id/selected-parts", inventoryController.getSelectedInventoryParts);
};
