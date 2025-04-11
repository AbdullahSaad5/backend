import { Router } from "express";
import { authController } from "@/controllers";
import { authValidation } from "@/validations";
import { authGuard } from "@/guards";
// import passport from "../passport"

export const auth = (router: Router) => {
  // Route for user registration
  router.post("/register", authValidation.registerUser, authController.registerUser);

  // Route for user login
  router.post("/login", authValidation.loginUser, authController.loginUser);

  // Route for Google social login
  router.post("/google-login", authController.googleLogin);

  router.post("/facebook-login", authController.facebookLogin);

  // Route for forgot password
  router.post("/forgot-password", authValidation.forgotPassword, authController.forgotPassword);

  // Route for reset password
  router.post("/reset-password/:token", authValidation.resetPassword, authController.resetPassword);

  // Route for get logedin user profile
  router.get("/profile", authGuard.isAuth, authController.getProfile);

  // Route for update user profile
  // TODO: add validation ' authValidation.updateProfile'
  router.patch("/update-profile", authGuard.isAuth, authController.updateProfile);

  // route for verify email
  router.get("/verify-email/:token", authController.verifyEmail);
};

// router.get("/google" , passport.authenticate("google" , {scope: ["profile" , "email"]}))

// router.get("/google/callback" , passport.authenticate("google" ,  {
//     failureRedirect: "/login", // Redirect if authentication fails
//     session: false,            // Disable sessions as we're using JWT
// }) , authController.googleAuth)

// Route for user login
