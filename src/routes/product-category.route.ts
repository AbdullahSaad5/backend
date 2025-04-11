import { productCategoryController } from "@/controllers";
import { productCategoryValidation } from "@/validations";
import { Router } from "express";

export const productCategory = (router: Router) => {
  router.post("/", productCategoryValidation.addCategory, productCategoryController.addCategory);

  router.get("/", productCategoryController.getAllCategory);

  router.patch("/:id", productCategoryValidation.updateCategory, productCategoryController.editCategory);

  router.delete("/:id", productCategoryValidation.validateId, productCategoryController.deleteCategory);

  router.get("/:id", productCategoryValidation.validateId, productCategoryController.getSpecificCategory);

  router.patch("/block/:id", productCategoryValidation.validateId, productCategoryController.toggleBlock);
};
