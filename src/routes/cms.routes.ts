import { Router } from "express";
import { cmsController, upload } from "../controllers/cms.controller";
import { cmsValidation } from "@/validations/cms.validation";
import { authGuard } from "@/guards";

export const cms = (router: Router) => {
  // Upload single HeroSection media
  router.post(
    "/hero-slider/upload-single",
    authGuard.isAuth,
    upload.single("file"),
    cmsValidation.addHeroSliderMedia,
    cmsController.uploadHeroSlider
  );
  // Upload multiple HeroSection media
  router.post(
    "/hero-slider/upload",
    authGuard.isAuth,
    upload.array("files"),
    cmsValidation.addHeroSliderMedia,
    cmsController.uploadHeroSliderMultiple
  );

  // List all HeroSection media
  router.get("/hero-slider", cmsController.listHeroSlider);

  // Delete a HeroSection media item
  router.delete("/hero-slider/:id", authGuard.isAuth, cmsController.deleteHeroSlider);
};
