import { Router } from "express";
import { authController } from "@/controllers";
import { authValidation } from "@/validations";
import { authGuard } from "@/guards";
import { authRateLimiter, passwordResetRateLimiter, createAccountRateLimiter, emailRateLimiter } from "@/middlewares";
// import passport from "../passport"

export const auth = (router: Router) => {
  // Route for user registration - limit account creation attempts
  router.post("/register", createAccountRateLimiter, authValidation.registerUser, authController.registerUser);

  // Route for user login - limit login attempts
  router.post("/login", authRateLimiter, authValidation.loginUser, authController.loginUser);

  // Route for Google social login - limit auth attempts
  router.post("/google-login", authRateLimiter, authController.googleLogin);

  // Route for Facebook social login - limit auth attempts
  router.post("/facebook-login", authRateLimiter, authController.facebookLogin);

  // Route for forgot password - limit password reset requests
  router.post("/forgot-password", passwordResetRateLimiter, authValidation.forgotPassword, authController.forgotPassword);

  // Route for reset password - limit password reset attempts
  router.post("/reset-password/:token", passwordResetRateLimiter, authValidation.resetPassword, authController.resetPassword);

  // Route for get logedin user profile
  router.get("/profile", authGuard.isAuth, authController.getProfile);

  // Route for update user profile
  // TODO: add validation ' authValidation.updateProfile'
  router.patch("/update-profile", authGuard.isAuth, authController.updateProfile);

  // route for verify email - limit email verification attempts
  router.get("/verify-email/:token", emailRateLimiter, authController.verifyEmail);
};

// router.get("/google" , passport.authenticate("google" , {scope: ["profile" , "email"]}))

// router.get("/google/callback" , passport.authenticate("google" ,  {
//     failureRedirect: "/login", // Redirect if authentication fails
//     session: false,            // Disable sessions as we're using JWT
// }) , authController.googleAuth)

// Route for user login
