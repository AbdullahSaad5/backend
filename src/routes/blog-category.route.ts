import { BlogCategoryController } from "@/controllers/blog-category.controller";
import { Router } from "express";
import { blogCategoryValidation } from "@/validations/blog-category.validation";

export const blogCategory = (router: Router) => {
  router.post(
    "/",
    // blogCategoryValidation.addCategory,
    BlogCategoryController.addCategory
  );

  router.get("/", BlogCategoryController.getAllCategory);

  router.patch(
    "/:id",
    // blogCategoryValidation.editCategory,
    BlogCategoryController.editCategory
  );

  router.delete(
    "/:id",
    // blogCategoryValidation.validateId,
    BlogCategoryController.deleteCategory
  );

  router.get(
    "/:id",
    // blogCategoryValidation.validateId,
    BlogCategoryController.getSpecificCategory
  );

  router.patch(
    "/block/:id",
    // blogCategoryValidation.validateId,
    BlogCategoryController.toggleBlock
  );
};
