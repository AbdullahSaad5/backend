import { Router } from "express";
import { announcementBarController } from "@/controllers";
import { AnnouncementBarValidation } from "@/validations";
import { authGuard } from "@/guards";

export const announcementBar = (router: Router) => {
  // Admin routes (protected with authentication)
  router.post("/", authGuard.isAuth, AnnouncementBarValidation.create, announcementBarController.createAnnouncementBar);

  router.get("/all", authGuard.isAuth, announcementBarController.getAnnouncementBars);

  router.patch(
    "/:id",
    authGuard.isAuth,
    AnnouncementBarValidation.update,
    announcementBarController.updateAnnouncementBar
  );

  router.delete("/:id", authGuard.isAuth, announcementBarController.deleteAnnouncementBar);

  // Public route (available to all users)
  router.get("/active", announcementBarController.getActiveAnnouncementBar);
};
