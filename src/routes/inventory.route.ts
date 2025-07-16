import { inventoryController } from "@/controllers";
import { inventoryValidation } from "@/validations";
import { Router } from "express";
import { handleBulkImport, handleBulkExport } from "@/controllers/inventory.controller.helper"; // Adjust import path as needed
import { uploadMiddleware } from "@/middlewares/multer.middleware";
import { bulkImportUtility } from "@/utils/bulkImport.util";
import { inventoryService } from "@/services";
import { bulkImportStandardTemplateGenerator } from "@/utils/bulkImportStandardTemplateGenerator.util";

export const inventory = (router: Router) => {
  // TODO: inventoryValidation.addInventory

  // Create or update a draft inventory
  router.post("/", inventoryController.createDraftInventory);
  router.get("/get-all-options", inventoryController.getAllOptions);
  router.patch(
    "/:id",
    // inventoryValidation.updateInventory,
    inventoryController.updateDraftInventoryController
  );

  // router.patch("/bulk-update-vat-and-discount", inventoryController.bulkUpdateInventoryTaxAndDiscount);
  //new route for search and filter and pagination
  router.get("/search", inventoryController.searchAndFilterInventory);
  router.get("/with-stock", inventoryController.getInventoriesWithStock);
  // New route for fetching inventory stats/ Widgets
  router.get("/stats", inventoryController.getInventoryStats);
  // Route for bulk import (POST request)
  router.post("/bulk-import", uploadMiddleware, handleBulkImport);

  // Route for bulk export (GET request)
  router.post("/bulk-export", handleBulkExport);

  router.get("/transform/:id", inventoryValidation.validateId, inventoryController.transformAndSendInventory);

  // Fetch transformed template inventory by ID
  router.get("/templates/:id", inventoryValidation.validateId, inventoryController.transformAndSendTemplateInventory);

  router.get("/drafts/:id", inventoryValidation.validateId, inventoryController.transformAndSendDraftInventory);

  // Fetch all template inventory  names
  router.get("/templates", inventoryController.getAllTemplateInventoryNames);

  // Fetch all Draft inventory  names
  router.get("/drafts", inventoryController.getAllDraftInventoryNames);
  router.get("/generate-xlsx-template", inventoryController.generateXLSXTemplate);

  // Update a draft inventory by ID (subsequent steps)

  router.get("/", inventoryController.getAllInventory);
  //

  router.get("/template/:id", inventoryValidation.validateId, inventoryController.getInventoryTemplateById);

  router.delete("/bulk-delete", inventoryController.bulkDeleteInventory);

  router.delete("/:id", inventoryValidation.validateId, inventoryController.deleteInventory);

  router.patch("/:id", inventoryValidation.updateInventory, inventoryController.updateInventoryById);

  // route for toggle block status
  router.patch("/block/:id", inventoryController.toggleBlock);

  // route for toggle  template status Change
  router.patch("/istemplate/:id", inventoryController.toggleIsTemplate);

  // Upsert (Create or Update) selected variations
  router.post("/:id/selected-parts", inventoryController.upsertInventoryParts);

  router.post("/:id/generate-variations", inventoryController.generateAndStoreVariations);

  router.patch("/:id/update-variations", inventoryController.storeSelectedVariations);

  router.get("/fetch-all-categories", bulkImportStandardTemplateGenerator.fetchAttributesForAllCategories); // only usable route to get all gategories from ebay and to create bulk import template
  router.get("/:id", inventoryValidation.validateId, inventoryController.getInventoryById);
  // Get selected variations for a inventory
  router.get("/:id/selected-parts", inventoryController.getSelectedInventoryParts);
};
