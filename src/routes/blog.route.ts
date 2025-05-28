import { blogController } from "@/controllers/Blog.controler";
import { Router } from "express";

export const blog = (router: Router) => {
  router.post(
    "/",
    // BlogValidation.addblog,
    blogController.addblog
  );

  router.get("/", blogController.getAllblog);

  router.patch(
    "/:id",
    // BlogValidation.editblog,
    blogController.editblog
  );

  router.delete(
    "/:id",
    // BlogValidation.validateId,
    blogController.deleteblog
  );

  router.get(
    "/:id",
    // BlogValidation.validateId,
    blogController.getSpecificblog
  );

  
};
