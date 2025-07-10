import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Address, User, UserCategory } from "@/models";
import { IUser } from "@/contracts/user.contract";
import { createHash } from "@/utils/hash.util";
import { userService } from "@/services";
import sendEmail from "@/utils/nodeMailer";

export const userController = {
  createUser: async (req: Request, res: Response) => {
    try {
      const { email, address } = req.body;

      const userExists: IUser | null =
        await userService.findExistingEmail(email);
      if (userExists) {
        return res
          .status(StatusCodes.CONFLICT)
          .json({ message: "User with this email already exists" });
      }

      if (req.body.phoneNumber) {
        console.log("req.body.phoneNumber : ", req.body.phoneNumber);
        const existingphoneNumber = await userService.findExistingPhoneNumber(
          req.body.phoneNumber
        );
        if (existingphoneNumber) {
          return res.status(StatusCodes.CONFLICT).json({
            message: "User with this phone number already exists! Try another",
          });
        }
      }

      const userCategory = await userService.findCategoryById(
        req.body.userType
      );
      if (!userCategory) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Invalid user category" });
      }

      const newUser = await userService.createUser(req.body);
      console.log("newUser : ", newUser);
      if (!newUser) {
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: "Error creating user" });
      }

      // Handle address update/addition if provided
      if (address && Array.isArray(address)) {
        for (const addr of address) {
          const createdAddress = await userService.createAddress(
            addr,
            newUser._id as string
          );
          if (!createdAddress) {
            return res.json({ message: "Error creating address" });
          }
        }
      }

      // Send email to the new user
      try {
        const password = req.body.password; // Assuming the password is passed in the request body
        const emailContent = `
        <p>Dear ${newUser.firstName || "User"},</p>
        <p>Your account has been created by the Bav-IT admin. Below are your login credentials:</p>
        <p><strong>Email:</strong> ${newUser.email}</p>
        <p><strong>Password:</strong> ${password}</p>
      `;

        await sendEmail({
          to: newUser.email,
          subject: "Your Bav-IT Account Has Been Created",
          html: emailContent,
        });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Log the email failure but continue to return a success response
      }

      res.status(StatusCodes.CREATED).json({
        message: "User created successfully, and email notification sent.",
        user: newUser,
      });
    } catch (error) {
      console.error(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error creating user" });
    }
  },

  updateUser: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      const { address } = updateData;
      //   console.log("address : " , address)

      if (updateData.email) {
        const email = updateData.email;
        console.log("email in update user : ", email);
        const userExists = await userService.findExistingEmail(email);
        if (userExists) {
          return res
            .status(StatusCodes.CONFLICT)
            .json({ message: "User with this email already exists" });
        } else {
          updateData.isEmailVerified = false;
        }
      }

      if (updateData.phoneNumber) {
        const existingphoneNumber = await userService.findExistingPhoneNumber(
          updateData.phoneNumber
        );
        if (existingphoneNumber) {
          return res.status(StatusCodes.CONFLICT).json({
            message: "User with this phone number already exists! Try another",
          });
        }
      }

      // console.log("updateData : " , updateData)

      if (updateData.password) {
        updateData.password = await createHash(updateData.password);
      }

      const updatedUser = await userService.updateById(userId, updateData);
      if (!updatedUser) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "User not found" });
      }
      // console.log("user.email : " , updateData.email , updatedUser.email)
      // if(updateData.email !== updatedUser.email){
      //   updatedUser.isEmailVerified = false;
      // }

      // Handle address updates if provided
      if (address && Array.isArray(address)) {
        for (const addr of address) {
          if (addr._id) {
            // Update existing address
            const updatedAddress = await userService.findAddressandUpdate(
              addr._id,
              addr
            );
            if (!updatedAddress) {
              return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Address not found" });
            }
          } else {
            // Create new address if _id is not present
            const createdAddress = await userService.createAddress(
              addr,
              userId
            );
            if (!createdAddress) {
              return res
                .status(StatusCodes.INTERNAL_SERVER_ERROR)
                .json({ message: "Error creating address" });
            }
          }
        }
      }

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "User Updated Successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "An error occurred while updating the user" });
    }
  },

  allUsers: async (req: Request, res: Response) => {
    try {
      const users = await userService.getAllUsers();
      res.status(StatusCodes.OK).json({ data: users });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error });
    }
  },

  getUserAddress: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Validate userId parameter
      if (!id) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: "User ID is required" });
      }
      // Find the address for the given userId
      const address = await Address.findOne({ userId: id });
      // Handle case where no address is found
      if (!address) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ error: "Address not found for this user" });
      }
      // Return the address
      return res.status(StatusCodes.OK).json({ address });
    } catch (error) {
      console.error(error); // Log the error for internal debugging
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "An error occurred while fetching the address" });
    }
  },

  getUserDetails: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const user = await userService.findUserById(userId, "+password");
      if (!user) return res.status(404).json({ message: "User not found" });
      const address = await userService.findAddressByUserId(userId);

      const userWithAddresses = { ...user.toObject(), address };

      res.status(StatusCodes.OK).json({ data: userWithAddresses });
    } catch (error) {
      console.error(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching user details" });
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    try {
      const user = await userService.deleteById(req.params.id);
      if (!user)
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "User not found" });
      res.status(StatusCodes.OK).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "An error occurred while deleting the user" });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const { isBlocked } = req.body;
      const result = await userService.toggleBlock(userId, isBlocked);
      const userEmailAddress = result?.email;
      const userName = result?.firstName || "User"; // Get the user's name (fallback to "User" if undefined)

      console.log("result: ", userEmailAddress, userName);

      const emailContent = `
      <p>Dear ${userName},</p>
      <p>Your account has been ${isBlocked ? "blocked" : "activated"} by the Bav-IT admin.</p>
      <p>If you have any questions, please contact support.</p>
    `;

      // Send the email
      if (userEmailAddress) {
        await sendEmail({
          to: userEmailAddress,
          subject: `Your Bav-IT Account Has Been ${isBlocked ? "Blocked" : "Activated"}`,
          html: emailContent,
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: `User ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: result,
      });
    } catch (error) {
      console.error("Toggle Block Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error updating user status" });
    }
  },

  updatePermissions: async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const additionalAccessRights = req.body.additionalAccessRights;
      const restrictedAccessRights = req.body.restrictedAccessRights;

      // console.log("id : ", id);
      // console.log("additionalAccessRights : ", additionalAccessRights);
      // console.log("restrictedAccessRights : ", restrictedAccessRights);

      const updatedUser = await userService.updatePermission(
        additionalAccessRights,
        restrictedAccessRights,
        id
      );
      res.status(StatusCodes.OK).json({
        message: "User access rights updated successfully",
        updatedUser: updatedUser,
      });
    } catch (error) {
      console.error("Error in updating access rights:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating user  updating access rights",
      });
    }
  },
  // New API for user stats Widgets

  getUserStats: async (req: Request, res: Response) => {
    try {
      const stats = await userService.getUserStats();
      return res.status(StatusCodes.OK).json(stats);
    } catch (error) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching user statistics" });
    }
  },

  getEmployeeList: async (req: Request, res: Response) => {},

  searchAndFilterUsers: async (req: Request, res: Response) => {
    try {
      // Extract filters from query params
      const {
        searchQuery = "",
        userType,
        isBlocked,
        startDate,
        endDate,
        additionalAccessRights,
        page = "1",
        limit = "10",
      } = req.query;

      // Prepare the filters object
      const filters = {
        searchQuery: searchQuery as string,
        userType: userType ? userType.toString() : undefined,
        isBlocked: isBlocked ? JSON.parse(isBlocked as string) : undefined, // Convert string to boolean
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        additionalAccessRights:
          additionalAccessRights && typeof additionalAccessRights === "string"
            ? additionalAccessRights.split(",")
            : undefined,
        page: parseInt(page as string, 10), // Convert page to number
        limit: parseInt(limit as string, 10), // Convert limit to number
      };

      // Call the service to search and filter the users
      const users = await userService.searchAndFilterUsers(filters);

      // Return the results
      res.status(200).json({
        success: true,
        message: "Search and filter completed successfully",
        data: users,
      });
    } catch (error) {
      console.error("Error in search and filter:", error);
      res.status(500).json({
        success: false,
        message: "Error in search and filter users",
      });
    }
  },
};

// new route to get Employee List
