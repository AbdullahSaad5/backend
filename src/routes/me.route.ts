import { meController } from "@/controllers";
import { authGuard } from "@/guards";
import { Router } from "express";

export const me = (router: Router) => {
  // Route for user registration
  router.get("/", authGuard.isAuth ,meController.info);
};
