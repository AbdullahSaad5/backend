import { Router } from "express";
import { customerAuthController } from "@/controllers/customer-auth.controller";
import { authValidation } from "@/validations";
import { authGuard } from "@/guards";
import { authRateLimiter, passwordResetRateLimiter, createAccountRateLimiter, emailRateLimiter } from "@/middlewares";

export const customerAuth = (router: Router) => {
  // Route for customer registration - limit account creation attempts
  router.post("/register", authValidation.registerUser, customerAuthController.registerCustomer);

  // Route for customer login - limit login attempts
  router.post("/login", authValidation.loginUser, customerAuthController.loginCustomer);

  // Route for customer Google social login - limit auth attempts
  router.post("/google-login", authRateLimiter, customerAuthController.googleLoginCustomer);

  // Route for customer Facebook social login - limit auth attempts
  router.post("/facebook-login", authRateLimiter, customerAuthController.facebookLoginCustomer);

  // Route for customer forgot password - limit password reset requests
  router.post(
    "/forgot-password",
    passwordResetRateLimiter,
    authValidation.forgotPassword,
    customerAuthController.forgotPasswordCustomer
  );

  // Route for customer reset password - limit password reset attempts
  router.post(
    "/reset-password/:token",
    passwordResetRateLimiter,
    authValidation.resetPassword,
    customerAuthController.resetPasswordCustomer
  );
};
