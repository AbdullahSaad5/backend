import { Router } from "express";
import { heroSliderController } from "@/controllers";
import { heroSliderValidation, heroSliderStatusValidation } from "@/validations";
import { authGuard } from "@/guards";
import multer from "multer";
import { digitalOceanSpacesStorage } from "@/config/digitalOceanSpaces";
import { Request, Response, NextFunction } from "express";

const upload = multer({ storage: digitalOceanSpacesStorage });

export const heroSlider = (router: Router) => {
  // Middleware to set imageUrl from uploaded file
  const setImageUrl = (req: Request, res: Response, next: NextFunction) => {
    if (req.file && (req.file as any).location) {
      req.body.imageUrl = (req.file as any).location;
    }
    next();
  };

  // Create a new slide
  router.post(
    "/",
    authGuard.isAuth,
    upload.single("asset"),
    setImageUrl,
    heroSliderValidation,
    heroSliderController.createSlide
  );

  // Get all slides
  router.get("/", heroSliderController.getSlides);

  // Update a slide
  router.put(
    "/:id",
    authGuard.isAuth,
    upload.single("asset"),
    setImageUrl,
    heroSliderValidation,
    heroSliderController.updateSlide
  );

  // Update slide status only
  router.patch(
    "/:id/status",
    authGuard.isAuth,
    heroSliderStatusValidation,
    heroSliderController.updateSlideStatus
  );

  // Delete a slide
  router.delete("/:id", authGuard.isAuth, heroSliderController.deleteSlide);
};
