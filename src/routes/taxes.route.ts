import { taxesController } from "@/controllers"; // Assuming you have a cart controller
import { authGuard } from "@/guards"; // Importing authentication guard
import { Router } from "express"; // Express Router for routing
import { auth } from "firebase-admin"; // Firebase authentication

export const taxes = (router: Router) => {
  // Optionally, add an authentication guard if needed
  // router.use(authGuard.isAuth);

  router.post("/", taxesController.createOrUpdateTax); // Create or update
  router.get("/", taxesController.getTax);
};
