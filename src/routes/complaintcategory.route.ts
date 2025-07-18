import { Router } from "express";
import { complaintCategoryController } from "@/controllers/complaintcategory.controller";

export const complaintcategory = (router: Router) => {
  router.post(
    "/",
    // complaintsValidation.addcomplaints,
    complaintCategoryController.createComplaintCategory
  );

  router.get("/", complaintCategoryController.getAllComplaintCategories);

  router.patch(
    "/:id",
    // complaintsValidation.editcomplaints,
    complaintCategoryController.updateComplaintCategory
  );
  router.patch(
    "/block/:id",
    // complaintsValidation.editcomplaints,
    complaintCategoryController.updateComplaintCategory
  );

  router.delete(
    "/:id",
    // complaintsValidation.validateId,
    complaintCategoryController.deleteComplaintCategory
  );

  router.get(
    "/:id",
    // complaintsValidation.validateId,
    complaintCategoryController.getComplaintCategoryById
  );

  
};
