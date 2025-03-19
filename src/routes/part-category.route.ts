import { partCategoryController } from "@/controllers";
import { partCategoryValidation } from "@/validations";
import { Router } from "express";

export const partCategory = (router: Router) => {
  router.post("/", partCategoryValidation.addCategory, partCategoryController.addCategory);

  router.get("/", partCategoryController.getAllCategory);

  router.patch("/:id", partCategoryValidation.updateCategory, partCategoryController.editCategory);

  router.delete("/:id", partCategoryValidation.validateId, partCategoryController.deleteCategory);

  router.get("/:id", partCategoryValidation.validateId, partCategoryController.getSpecificCategory);

  router.patch("/block/:id", partCategoryValidation.validateId, partCategoryController.toggleBlock);
};
