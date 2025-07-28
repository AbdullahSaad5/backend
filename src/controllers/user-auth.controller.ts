import { NextFunction, Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { authService } from "@/services";
import { Address, User, UserCategory } from "@/models";
import { jwtSign, jwtVerify } from "@/utils/jwt.util";
import crypto from "crypto";
import sendEmail from "@/utils/nodeMailer";
import { OAuth2Client } from "google-auth-library";
import mongoose from "mongoose";

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const authController = {
  registerUser: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      // Check if user already exist
      const existingUser = await authService.findExistingEmail(email);
      if (existingUser) {
        return res.status(StatusCodes.CONFLICT).json({ message: "User with this email already exists! Try Login" });
      }

      if (req.body.phoneNumber) {
        console.log("req.body.phoneNumber : ", req.body.phoneNumber);
        const existingphoneNumber = await authService.findExistingPhoneNumber(req.body.phoneNumber);
        if (existingphoneNumber) {
          return res
            .status(StatusCodes.CONFLICT)
            .json({ message: "User with this phone number already exists! Try another" });
        }
      }

      // Create new user
      const newUser = await authService.createUser(req.body);

      // send verification email
      const verificationToken = jwtSign(newUser.id);
      // const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken.accessToken}`;

      const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
    <h2 style="color: #4CAF50;">Welcome to Our Platform!</h2>
    <p>Hi ${newUser.firstName},</p>
    <p>Thank you for signing up with us! To complete your registration and start using your account, please verify your email address by clicking the link below:</p>
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

      // Use sendEmail to send the verification email
      await sendEmail({
        to: newUser.email,
        subject: "Verify your email address",
        html,
      });
      res.status(StatusCodes.CREATED).json({
        message: "User registered successfully, Please check your email to verify your account.",
        user: newUser,
        verificationToken: verificationToken.accessToken, // Include token for testing purposes
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error registering user" });
    }
  },

  loginUser: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Get the userType from the request header (case-insensitive)
      const userTypeFromHeader = req.headers["x-user-type"] || req.headers["X-User-Type"];
      console.log("userTypeFromHeader:", userTypeFromHeader);

      // Find user by email first
      const user: any = await authService.findExistingEmail(email, "+password");
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "User does not exist!",
          status: StatusCodes.NOT_FOUND,
        });
      }

      if (user.signUpThrough !== "Web") {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Access denied. User did not sign up through Web.",
          status: StatusCodes.FORBIDDEN,
        });
      }

      console.log("User role from database:", user.userType.role);

      // Check if email is verified
      if (!user.isEmailVerified) {
        // send verification email again
        const verificationToken = jwtSign(user.id);
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken.accessToken}`;
        const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #4CAF50;">Welcome to Our Platform!</h2>
          <p>Hi ${user.firstName},</p>
          <p>Thank you for signing up with us! To complete your registration and start using your account, please verify your email address by clicking the link below:</p>
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
          to: user.email,
          subject: "Verify your email address",
          html,
        });
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Please verify your email before logging in. Verification email has been sent!",
          status: StatusCodes.FORBIDDEN,
        });
      }

      // Restrict Admin and SuperAdmin to login only with 'X-User-Type: Admin'
      if ((user.userType.role === "admin" || user.userType.role === "super admin") && userTypeFromHeader !== "admin") {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Admin must use their respective login page.",
          status: StatusCodes.FORBIDDEN,
        });
      }

      // Restrict other roles to login only without 'X-User-Type: Admin'
      if (userTypeFromHeader === "admin" && user.userType.role !== "admin" && user.userType.role !== "super admin") {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "You are not authorized to use the Admin login page.",
          status: StatusCodes.FORBIDDEN,
        });
      }

      // Check password using the model method
      const isPasswordValid = user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          message: "Incorrect Password!",
          status: StatusCodes.UNAUTHORIZED,
        });
      }

      // Only unblock users can sign in
      const isUserBlocked = user.isBlocked;
      console.log("is blocked before login : ", isUserBlocked);
      if (isUserBlocked) {
        console.log("user is blocked, can't login");
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "User is blocked by Admin. Please contact support.",
          status: StatusCodes.FORBIDDEN,
        });
      }

      // Generate JWT Tokens
      const { accessToken, refreshToken } = jwtSign(user.id);

      // Respond with user data and tokens
      return res.status(StatusCodes.OK).json({
        data: {
          user: user.toJSON(),
          accessToken,
          refreshToken,
        },
        message: ReasonPhrases.OK,
        status: StatusCodes.OK,
      });
    } catch (err: any) {
      console.error("Error in loginUser:", err.message || err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }
  },

  googleLogin: async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName, profileImage, userType, isEmailVerified, signUpThrough } = req.body;
      // console.log("details : ", userType, email, firstName, lastName, profileImage, signUpThrough);
      let user = await authService.findExistingEmail(email);
      if (!user) {
        console.log("new user added");
        user = await new User({
          firstName,
          lastName,
          email,
          signUpThrough,
          userType,
          isEmailVerified,
          profileImage,
        });
      }
      console.log("user already exist");

      if (user.isBlocked) {
        console.log("user is blocked, can't login");
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "User is blocked by Admin. Please contact support.",
          status: StatusCodes.FORBIDDEN,
        });
      }

      await user.save();

      const userTypee = await UserCategory.findById(userType);
      // console.log("usertype : ", userTypee);

      // Generate tokens
      const { accessToken, refreshToken } = jwtSign(user?.id);
      return res.status(StatusCodes.OK).json({
        user,
        userType: userTypee,
        accessToken,
        refreshToken,
        message: ReasonPhrases.OK,
        status: StatusCodes.OK,
      });
    } catch (error) {
      console.error("Google login error:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error during Google login" });
    }
  },

  facebookLogin: async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName, profileImage, userType, signUpThrough } = req.body;
      console.log("details : ", userType, email, firstName, lastName, profileImage, signUpThrough);
      let user = await authService.findExistingEmail(email);
      if (!user) {
        user = await new User({
          firstName,
          lastName,
          email,
          signUpThrough,
          userType,
          isEmailVerified: true,
          profileImage,
        });
      }
      await user.save();

      const userTypee = await UserCategory.findById(userType);
      console.log("usertype : ", userTypee);

      // Generate tokens
      const { accessToken, refreshToken } = jwtSign(user?.id);
      return res.status(StatusCodes.OK).json({
        user,
        userType: userTypee,
        accessToken,
        refreshToken,
        message: ReasonPhrases.OK,
        status: StatusCodes.OK,
      });
    } catch (error) {
      console.error("Google login error:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error during Google login" });
    }
  },

  verifyEmail: async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      if (!token || typeof token !== "string") {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid verification token." });
      }
      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();
      const user = await authService.findUserById(userId);
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "User not found." });
      }
      // Check if already verified
      if (user.isEmailVerified) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Email is already verified." });
      }

      // Update user's verification status
      user.isEmailVerified = true;
      user.EmailVerifiedAt = new Date();
      await user.save();

      // Send success email
      const html = `
    <p>Your email has been successfully verified. You can now log in and access your account.</p>
    <p>Thank you for verifying your email!</p>
  `;

      await sendEmail({
        to: user.email,
        subject: "Email Verified Successfully",
        html,
      });

      res.status(StatusCodes.OK).json({ success: true, message: "Email verified successfully." });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Invalid or expired token." });
    }
  },

  getProfile: async (req: Request | any, res: Response) => {
    try {
      const user = req.context.user;

      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
      }

      // Fetch all addresses associated with the user
      const userAddresses = await authService.findAddressByUserId(user._id);

      return res.status(StatusCodes.OK).json({ user, address: userAddresses });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching user profile" });
    }
  },

  updateProfile: async (req: any | Request, res: Response) => {
    try {
      const { firstName, lastName, phoneNumber, email, dob, address, profileImage, oldPassword, newPassword } =
        req.body;
      // console.log("data in auth controller : ", address);

      const user: any = req.context.user;
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
      }

      if (email) {
        console.log("user.isEmailVerified : ", user.isEmailVerified);
        console.log("user.email : ", email, user.email);
        if (email !== user.email) {
          user.isEmailVerified = false;
        }
        user.email = email;
        console.log("user.isEmailVerified : ", user.isEmailVerified);
      }
      if (firstName) {
        user.firstName = firstName;
      }
      if (lastName) {
        user.lastName = lastName;
      }
      if (phoneNumber) {
        console.log("phoneNumber : ", phoneNumber);
        const existingphoneNumber = await authService.findExistingPhoneNumber(phoneNumber);
        console.log("existingphoneNumber : ", existingphoneNumber);
        if (existingphoneNumber) {
          console.log("returning reposne : ");
          return res
            .status(StatusCodes.CONFLICT)
            .json({ message: "User with this phone number already exists! Try another" });
        } else {
          console.log("else running of phone");
          user.phoneNumber = phoneNumber;
        }
      }
      if (profileImage) {
        user.profileImage = profileImage;
      }
      // if (dob) {
      //   user.dob = dob;
      // }
      if (newPassword) {
        if (!oldPassword) {
          // Old password must be provided if new password is being updated
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Old password is required to update the password",
          });
        }
        // Verify the old password
        const isPasswordCorrect = user.comparePassword(oldPassword);
        if (!isPasswordCorrect) {
          return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: "Old password is incorrect",
          });
        }
        // Hash the new password and update it
        user.password = user.hashPassword(newPassword);
      }

      // Handle address update/addition if provided
      if (address && Array.isArray(address)) {
        // console.log("address inside IFF :", address);

        for (const addr of address) {
          // console.log("inside for addr: ", addr);

          if (addr._id && mongoose.Types.ObjectId.isValid(addr._id)) {
            // console.log("id of address exist : ", addr._id);
            // If address ID exists, update the existing address
            // await Address.findByIdAndUpdate(addr._id, addr);
            await authService.findAddressandUpdate(addr._id, addr);
          } else {
            console.log("Creating new address for user ID:", user._id);
            // Remove _id if it's an empty string before creating a new address
            const newAddress = { ...addr, userId: user._id };
            delete newAddress._id; // Ensure _id is not included for new address creation
            await Address.create(newAddress); // Create new address
          }
        }
      }

      await user.save();

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Profile updated successfully",
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          profileImage: user.profileImage,
          email: user.email,
          dob: user.dob,
          // address: user.address
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating profile",
      });
    }
  },

  forgotPassword: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const user = await authService.findExistingEmail(email);
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "User does not exist! Try another email",
          status: StatusCodes.NOT_FOUND,
        });
      }

      // Generate a reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
      // console.log("Reset token (plain):", resetToken);
      // console.log("Reset token (hashed):", resetTokenHash);
      const resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiration

      // Save the token and expiry to the user record
      user.resetPasswordToken = resetTokenHash;
      user.resetPasswordExpires = resetTokenExpiry;
      await user.save();

      // Construct reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      console.log("resetURL : ", resetUrl);

      const message = `
        <p>You requested a password reset.</p>
        <p>Please click the link below to reset your password:</p>
        <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
        <p>This link is valid for 10 minutes.</p>
       `;

      try {
        await sendEmail({
          to: user.email,
          subject: "Password Reset Request",
          html: message,
        });
        res.status(StatusCodes.OK).json({
          success: true,
          message: "Reset password email sent",
        });
      } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        throw new Error("Email could not be sent");
      }
    } catch (error) {
      console.error("Error in forgotPassword:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error processing request" });
    }
  },

  resetPassword: async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      // console.log("Received token:", token);
      const { password } = req.body;
      // console.log("Received password:", password);

      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      console.log("Hashed token:", hashedToken);

      // Find user by the reset token and check expiration
      const user = await authService.findUserByResetToken(hashedToken);
      console.log("USER: ", user);
      if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
        console.log("Token invalid or expired.");
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid or expired token" });
      }

      console.log("User found:", user);

      // Update the password and clear the reset token
      user.password = user.hashPassword(password);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(StatusCodes.OK).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error in resetPassword:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error processing request" });
    }
  },
};
