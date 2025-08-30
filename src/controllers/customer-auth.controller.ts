import { NextFunction, Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { authService } from "@/services";
import { Address, User, UserCategory } from "@/models";
import { jwtSign, jwtVerify } from "@/utils/jwt.util";
import crypto from "crypto";
import sendEmail from "@/utils/nodeMailer";
import { OAuth2Client } from "google-auth-library";
import mongoose from "mongoose";
import { UserRegisterPayload } from "@/contracts/user-auth.contract";

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Customer userType ID - ensures all customer registrations use this specific category
const CUSTOMER_USER_TYPE_ID = "687e39f44c2f09da2370aab3";

export const customerAuthController = {
  /**
   * Register a new customer
   */
  registerCustomer: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      // Check if user already exists
      const existingUser = await authService.findExistingEmail(email);
      if (existingUser) {
        return res.status(StatusCodes.CONFLICT).json({
          message: "Customer with this email already exists! Try Login",
        });
      }

      if (req.body.phoneNumber) {
        console.log("req.body.phoneNumber : ", req.body.phoneNumber);
        const existingphoneNumber = await authService.findExistingPhoneNumber(req.body.phoneNumber);
        if (existingphoneNumber) {
          return res
            .status(StatusCodes.CONFLICT)
            .json({ message: "Customer with this phone number already exists! Try another" });
        }
      }

      // Ensure customer role assignment with specific userType
      const customerData = {
        ...req.body,
        userType: new mongoose.Types.ObjectId(CUSTOMER_USER_TYPE_ID), // Customer category ID
      };

      // Create new customer
      const newCustomer = await authService.createUser(customerData);

      // Send verification email
      const verificationToken = jwtSign(newCustomer.id);
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken.accessToken}`;

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #4CAF50;">Welcome to Our Platform!</h2>
          <p>Hi ${newCustomer.firstName},</p>
          <p>Thank you for creating your customer account with us! To complete your registration and start shopping, please verify your email address by clicking the link below:</p>
          <p>
            <a
              href="${verificationUrl}"
              style="display: inline-block; padding: 10px 20px; margin: 10px 0; color: white; background-color: #4CAF50; text-decoration: none; border-radius: 5px;"
            >
              Verify Email
            </a>
          </p>
          <p>If you didn't create this account, please ignore this email.</p>
          <p>Best regards,<br>The Team</p>
        </div>
      `;

      // Use sendEmail to send the verification email
      await sendEmail({
        to: newCustomer.email,
        subject: "Verify your customer account email address",
        html,
      });

      res.status(StatusCodes.CREATED).json({
        message: "Customer registered successfully! Please check your email to verify your account.",
        customer: newCustomer,
        verificationToken: verificationToken.accessToken, // Include token for testing purposes
      });
    } catch (error) {
      console.error("Error registering customer:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error registering customer",
      });
    }
  },

  /**
   * Login customer
   */
  loginCustomer: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Find customer by email first
      const customer: any = await authService.findExistingEmail(email, "+password");
      if (!customer) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Customer does not exist!",
          status: StatusCodes.NOT_FOUND,
        });
      }

      if (customer.signUpThrough !== "Web") {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Access denied. Customer did not sign up through Web.",
          status: StatusCodes.FORBIDDEN,
        });
      }

      console.log("Customer role from database:", customer.userType?.role);

      // Restrict admin users from using customer login
      if (customer.userType?.role === "admin" || customer.userType?.role === "super admin") {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Admin users cannot use the customer login. Please use the admin login page.",
          status: StatusCodes.FORBIDDEN,
        });
      }

      // Check if email is verified
      if (!customer.isEmailVerified) {
        // Send verification email again
        const verificationToken = jwtSign(customer.id);
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken.accessToken}`;
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
            <h2 style="color: #4CAF50;">Email Verification Required</h2>
            <p>Hi ${customer.firstName},</p>
            <p>Please verify your email address to access your customer account. Click the link below:</p>
            <p>
              <a
                href="${verificationUrl}"
                style="display: inline-block; padding: 10px 20px; margin: 10px 0; color: white; background-color: #4CAF50; text-decoration: none; border-radius: 5px;"
              >
                Verify Email
              </a>
            </p>
          </div>
        `;
        await sendEmail({
          to: customer.email,
          subject: "Verify your customer account email address",
          html,
        });
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Please verify your email before logging in. Verification email has been sent!",
          status: StatusCodes.FORBIDDEN,
        });
      }

      // Check password using the model method
      const isPasswordValid = customer.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          message: "Invalid credentials",
          status: StatusCodes.UNAUTHORIZED,
        });
      }

      // Generate JWT token
      const token = jwtSign(customer.id);

      res.status(StatusCodes.OK).json({
        message: "Customer login successful",
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phoneNumber: customer.phoneNumber,
          userType: customer.userType,
          isEmailVerified: customer.isEmailVerified,
        },
        token,
      });
    } catch (error: any) {
      console.error("Error in customer login:", error.message || error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Internal server error during customer login",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }
  },

  /**
   * Customer Google OAuth login
   */
  googleLoginCustomer: async (req: Request, res: Response) => {
    try {
      console.log("🔍 Google login request body:", JSON.stringify(req.body, null, 2));
      const { token } = req.body;

      if (!token) {
        console.log("❌ Google token missing in request");
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Google token is required",
          status: StatusCodes.BAD_REQUEST,
        });
      }

      console.log("🔍 Google token received:", token.substring(0, 20) + "...");
      console.log("🔍 GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Missing");

      // Verify the Google token
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      console.log("🔍 Google token payload:", JSON.stringify(payload, null, 2));

      if (!payload || !payload.email) {
        console.log("❌ Invalid Google token payload");
        return res.status(StatusCodes.UNAUTHORIZED).json({
          message: "Invalid Google token",
          status: StatusCodes.UNAUTHORIZED,
        });
      }

      const { email, given_name, family_name, picture } = payload;
      console.log("✅ Google user data extracted:", { email, given_name, family_name });

      // Check if customer already exists
      let customer: any = await authService.findExistingEmail(email);

      if (customer) {
        console.log("✅ Existing customer found:", customer.email);
        console.log("🔍 Customer userType:", customer.userType);

        // Restrict admin users from using customer Google login
        if (customer.userType?.role === "admin" || customer.userType?.role === "super admin") {
          console.log("🚫 Admin user attempting customer Google login");
          return res.status(StatusCodes.FORBIDDEN).json({
            message: "Admin users cannot use customer Google login.",
            status: StatusCodes.FORBIDDEN,
          });
        }

        // Generate JWT token for existing customer
        const jwtToken = jwtSign(customer.id);
        console.log("✅ JWT token generated for existing customer");
        return res.status(StatusCodes.OK).json({
          message: "Customer Google login successful",
          customer: {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            userType: customer.userType,
            isEmailVerified: customer.isEmailVerified,
          },
          token: jwtToken,
        });
      }

      // Create new customer account
      const customerData: UserRegisterPayload = {
        firstName: given_name || "",
        lastName: family_name || "",
        email: email,
        password: "", // No password needed for OAuth
        phoneNumber: "",
        signUpThrough: "Google",
        userType: new mongoose.Types.ObjectId(CUSTOMER_USER_TYPE_ID), // Customer category ID
      };

      const newCustomer = await authService.createUser(customerData);

      const jwtToken = jwtSign(newCustomer.id);

      res.status(StatusCodes.CREATED).json({
        message: "Customer account created and logged in successfully via Google",
        customer: {
          id: newCustomer.id,
          firstName: newCustomer.firstName,
          lastName: newCustomer.lastName,
          email: newCustomer.email,
          userType: newCustomer.userType,
          isEmailVerified: newCustomer.isEmailVerified,
        },
        token: jwtToken,
      });
    } catch (error: any) {
      console.error("Error in customer Google login:", error.message || error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Internal server error during Google login",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }
  },

  /**
   * Customer Facebook OAuth login
   */
  facebookLoginCustomer: async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Facebook access token is required",
          status: StatusCodes.BAD_REQUEST,
        });
      }

      // Fetch user data from Facebook Graph API
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture&access_token=${accessToken}`
      );
      const facebookUser = await response.json();

      if (!facebookUser.email) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Facebook account must have an email address",
          status: StatusCodes.BAD_REQUEST,
        });
      }

      // Check if customer already exists
      let customer: any = await authService.findExistingEmail(facebookUser.email);

      if (customer) {
        // Restrict admin users from using customer Facebook login
        if (customer.userType?.role === "admin" || customer.userType?.role === "super admin") {
          return res.status(StatusCodes.FORBIDDEN).json({
            message: "Admin users cannot use customer Facebook login.",
            status: StatusCodes.FORBIDDEN,
          });
        }

        // Generate JWT token for existing customer
        const jwtToken = jwtSign(customer.id);
        return res.status(StatusCodes.OK).json({
          message: "Customer Facebook login successful",
          customer: {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            userType: customer.userType,
            isEmailVerified: customer.isEmailVerified,
          },
          token: jwtToken,
        });
      }

      // Create new customer account
      const customerData: UserRegisterPayload = {
        firstName: facebookUser.first_name || "",
        lastName: facebookUser.last_name || "",
        email: facebookUser.email,
        password: "", // No password needed for OAuth
        phoneNumber: "",
        signUpThrough: "Facebook",
        userType: new mongoose.Types.ObjectId(CUSTOMER_USER_TYPE_ID), // Customer category ID
      };

      const newCustomer = await authService.createUser(customerData);

      const jwtToken = jwtSign(newCustomer.id);

      res.status(StatusCodes.CREATED).json({
        message: "Customer account created and logged in successfully via Facebook",
        customer: {
          id: newCustomer.id,
          firstName: newCustomer.firstName,
          lastName: newCustomer.lastName,
          email: newCustomer.email,
          userType: newCustomer.userType,
          isEmailVerified: newCustomer.isEmailVerified,
        },
        token: jwtToken,
      });
    } catch (error: any) {
      console.error("Error in customer Facebook login:", error.message || error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Internal server error during Facebook login",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }
  },

  /**
   * Customer forgot password
   */
  forgotPasswordCustomer: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      console.log("🔍 Forgot password request for email:", email);

      // Find customer by email
      const customer: any = await authService.findExistingEmail(email);
      if (!customer) {
        console.log("❌ Customer not found for email:", email);
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Customer with this email does not exist",
          status: StatusCodes.NOT_FOUND,
        });
      }

      console.log("✅ Customer found:", customer.firstName, customer.email);
      console.log("🔍 Customer userType:", customer.userType);

      // Restrict admin users from using customer password reset
      if (customer.userType?.role === "admin" || customer.userType?.role === "super admin") {
        console.log("🚫 Admin user attempting customer password reset");
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Admin users cannot use customer password reset. Please use the admin password reset.",
          status: StatusCodes.FORBIDDEN,
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
      console.log("🔑 Generated reset token hash:", resetTokenHash.substring(0, 10) + "...");

      // Save hashed token and expiry to customer record
      customer.resetPasswordToken = resetTokenHash;
      customer.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await customer.save();
      console.log("💾 Saved reset token to customer record");

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/customer/reset-password/${resetToken}`;
      console.log("🔗 Reset URL:", resetUrl);

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2>Password Reset Request</h2>
          <p>Hi ${customer.firstName},</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p>This link will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `;

      console.log("📧 Attempting to send reset password email to:", customer.email);

      await sendEmail({
        to: customer.email,
        subject: "Reset your password",
        html,
      });
      console.log("✅ Reset password email sent successfully");

      res.status(StatusCodes.OK).json({
        message: "Password reset email sent to customer account",
        status: StatusCodes.OK,
      });
    } catch (error: any) {
      console.error("❌ Error in customer forgot password:", error.message || error);
      console.error("📋 Full error stack:", error.stack);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error sending password reset email",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }
  },

  /**
   * Customer reset password
   */
  resetPasswordCustomer: async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      // Hash the token from params to compare with stored hash
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

      // Find customer with matching token and check if token is not expired
      const customer: any = await authService.findUserByResetToken(hashedToken);
      if (!customer) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Invalid or expired password reset token",
          status: StatusCodes.BAD_REQUEST,
        });
      }

      // Update customer password and clear reset token
      customer.password = password;
      customer.resetPasswordToken = undefined;
      customer.resetPasswordExpires = undefined;
      await customer.save();

      res.status(StatusCodes.OK).json({
        message: "Customer password reset successfully",
        status: StatusCodes.OK,
      });
    } catch (error: any) {
      console.error("Error in customer reset password:", error.message || error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error resetting customer password",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }
  },
};
