import { couponController } from "@/controllers"; // Assuming you have a cart controller
import { authGuard } from "@/guards"; // Importing authentication guard
import { Router } from "express"; // Express Router for routing
import { auth } from "firebase-admin"; // Firebase authentication

export const couponRoutes = (router: Router) => {
  // Optionally, add an authentication guard if needed
  // router.use(authGuard.isAuth);
  router.post("/", couponController.createCoupon);
  router.get("/", couponController.getAllCoupons);
  router.get("/:id", couponController.getCouponById);
  router.put("/:id", couponController.updateCoupon);
  router.delete("/:id", couponController.deleteCoupon);
  router.post("/validate", couponController.validateCoupon);
};
