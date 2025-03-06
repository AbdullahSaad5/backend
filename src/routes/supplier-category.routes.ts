import { supplierCategoryController, supplierController } from "@/controllers";
import { Router } from "express";
import { supplierCategoryValidation } from "@/validations";

export const supplierCategory = (router: Router) => {
  router.post(
    "/",
    supplierCategoryValidation.addCategory,
    supplierCategoryController.addCategory
  );

  router.get("/", supplierCategoryController.getAllCategory);

  router.patch(
    "/:id",
    supplierCategoryValidation.editCategory,
    supplierCategoryController.editCategory
  );

  router.delete(
    "/:id",
    supplierCategoryValidation.validateId,
    supplierCategoryController.deleteCategory
  );

  router.get(
    "/:id",
    supplierCategoryValidation.validateId,
    supplierCategoryController.getSpecificCategory
  );

  router.patch(
    "/block/:id",
    supplierCategoryValidation.validateId,
    supplierCategoryController.toggleBlock
  );
};
