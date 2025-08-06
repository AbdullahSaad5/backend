
import { CategoryController } from "@/controllers/forum-category.controller";
import { Router } from "express";


export const ForumCategory = (router: Router) => {
  router.post(
    "/",

    CategoryController.createCategory
  );

  router.get(
    "/",
    CategoryController.getAllCategories
  )



};
