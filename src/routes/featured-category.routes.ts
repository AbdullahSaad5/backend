import { Router } from "express";
import { featuredCategoryController } from "@/controllers";
import { featuredCategoryValidation } from "@/validations";
import { authGuard } from "@/guards";
import multer from "multer";
import { digitalOceanSpacesStorage } from "@/config/digitalOceanSpaces";
import { Request, Response, NextFunction } from "express";

const upload = multer({ storage: digitalOceanSpacesStorage });

export const featuredCategory = (router: Router) => {
  // Middleware to set imageUrl from uploaded file
  const setImageUrl = (req: Request, res: Response, next: NextFunction) => {
    if (req.file && (req.file as any).location) {
      req.body.imageUrl = (req.file as any).location;
    }
    next();
  };

  // Create a new featured category
  router.post(
    "/",
    authGuard.isAuth,
    upload.single("asset"),
    setImageUrl,
    featuredCategoryValidation,
    featuredCategoryController.createCategory
  );

  // Get all featured categories
  router.get("/", featuredCategoryController.getCategories);

  // Get active categories only
  router.get("/active", featuredCategoryController.getActiveCategories);

  // Update a featured category
  router.put(
    "/:id",
    authGuard.isAuth,
    upload.single("asset"),
    setImageUrl,
    featuredCategoryValidation,
    featuredCategoryController.updateCategory
  );

  // Update status only
  router.patch(
    "/:id/status",
    authGuard.isAuth,
    featuredCategoryController.updateStatus
  );

  // Delete a featured category
  router.delete("/:id", authGuard.isAuth, featuredCategoryController.deleteCategory);
};
