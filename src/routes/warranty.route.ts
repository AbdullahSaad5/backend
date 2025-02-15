import { warrantyController } from "@/controllers"; // Assuming you have a warranty controller
import { authGuard } from "@/guards";
import { Router } from "express";
import { auth } from "firebase-admin";

export const warranty = (router: Router) => {
  // router.use(authGuard.isAuth);
  // Route to create a new warranty
  router.post("/", warrantyController.createWarranty); // Create Warranty
  router.get("/", warrantyController.getAllWarranties); // Get All Warranties
  router.get("/:id", warrantyController.getWarrantyById); // Get Single Warranty
  router.put("/:id", warrantyController.updateWarranty); // Update Warranty
  router.delete("/:id", warrantyController.deleteWarranty); // Delete Warranty
};
