import { Router } from "express";
import { featuredSaleController } from "@/controllers";
import {
  featuredSaleValidation,
  featuredSaleStatusValidation,
} from "@/validations";
import { authGuard } from "@/guards";
import multer from "multer";
import { digitalOceanSpacesStorage } from "@/config/digitalOceanSpaces";
import { Request, Response, NextFunction } from "express";

const upload = multer({ storage: digitalOceanSpacesStorage });

export const featuredSale = (router: Router) => {
  // Middleware to set imageUrl from uploaded file
  const setImageUrl = (req: Request, res: Response, next: NextFunction) => {
    if (req.file && (req.file as any).location) {
      req.body.imageUrl = (req.file as any).location;
    }
    next();
  };

  // Create a new sale
  router.post(
    "/",
    authGuard.isAuth,
    upload.single("asset"),
    setImageUrl,
    featuredSaleValidation,
    featuredSaleController.createSale
  );

  // Get all sales
  router.get("/", featuredSaleController.getSales);

  // Get active sales only
  router.get("/active", featuredSaleController.getActiveSales);

  // Update a sale
  router.put(
    "/:id",
    authGuard.isAuth,
    upload.single("asset"),
    setImageUrl,
    featuredSaleValidation,
    featuredSaleController.updateSale
  );

  // Update sale status only
  router.patch(
    "/:id/status",
    authGuard.isAuth,
    featuredSaleStatusValidation,
    featuredSaleController.updateSaleStatus
  );

  // Delete a sale
  router.delete("/:id", authGuard.isAuth, featuredSaleController.deleteSale);
};
