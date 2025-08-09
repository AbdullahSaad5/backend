import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Address, User, UserCategory } from "@/models";
import { IUser, ProfileCompletionPayload } from "@/contracts/user.contract";
import { createHash } from "@/utils/hash.util";
import { userService } from "@/services";
import sendEmail from "@/utils/nodeMailer";

export const userController = {
  createUser: async (req: Request, res: Response) => {
    console.log("req.body : ", req.body);

    try {
      const { email, address, longitude, latitude } = req.body;
      // console.log("longitude : ", longitude);
      // console.log("latitude : ", latitude);

      const userExists = await userService.findExistingEmail(email);
      if (userExists) {
        return res.status(StatusCodes.CONFLICT).json({ message: "User with this email already exists" });
      }

      if (req.body.phoneNumber) {
        console.log("req.body.phoneNumber : ", req.body.phoneNumber);
        const existingphoneNumber = await userService.findExistingPhoneNumber(req.body.phoneNumber);
        if (existingphoneNumber) {
          return res.status(StatusCodes.CONFLICT).json({
            message: "User with this phone number already exists! Try another",
          });
        }
      }

      const userCategory = await userService.findCategoryById(req.body.userType);
      if (!userCategory) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid user category" });
      }

      const newUser = await userService.createUser(req.body);
      console.log("newUser : ", newUser);
      if (!newUser) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error creating user" });
      }

      // Handle multiple addresses if provided
      if (address && Array.isArray(address) && address.length > 0) {
        try {
          // Validate addresses before saving
          const validAddresses = address.filter(
            (addr) => addr.country && addr.city && addr.address && addr.postalCode && addr.latitude && addr.longitude
          );

          if (validAddresses.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              message: "At least one valid address is required",
            });
          }

          // Create multiple addresses using the service
          const createdAddresses = await userService.createMultipleAddresses(validAddresses, newUser._id as string);

          if (!createdAddresses || createdAddresses.length === 0) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
              message: "Error creating addresses",
            });
          }

          console.log(`Created ${createdAddresses.length} addresses for user ${newUser._id}`);
        } catch (addressError) {
          console.error("Error creating addresses:", addressError);
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error creating user addresses",
          });
        }
      } else {
        // Handle legacy single address with longitude/latitude at root level
        if (longitude && latitude) {
          const legacyAddress = {
            country: req.body.country || "United Kingdom",
            city: req.body.city || "",
            county: req.body.county || "",
            address: req.body.streetAddress || "",
            appartment: req.body.appartment || "",
            postalCode: req.body.postalCode || "",
            longitude,
            latitude,
            isDefault: true,
          };

          try {
            const createdAddress = await userService.createAddress(legacyAddress, newUser._id as string);
            if (!createdAddress) {
              return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: "Error creating address",
              });
            }
          } catch (addressError) {
            console.error("Error creating legacy address:", addressError);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
              message: "Error creating user address",
            });
          }
        }
      }
      // Send email to the new user
      try {
        const password = req.body.password; // Assuming the password is passed in the request body
        const emailContent = `
        <p>Dear ${newUser.firstName || "User"},</p>
        <p>Your account has been created by Build-My-Rig admin. Below are your login credentials:</p>
        <p><strong>Employee ID:</strong> ${newUser.employeeId}</p>
        <p><strong>Email:</strong> ${newUser.email}</p>
        <p><strong>Password:</strong> ${password}</p>
      `;

        await sendEmail({
          to: newUser.email,
          subject: "Your Build-My-Rig Account Has Been Created",
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
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error creating user" });
    }
  },

  updateUser: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      const { addresses } = updateData;
      console.log("addresssdfsdf : ", addresses);

      if (updateData.email) {
        const email = updateData.email;
        console.log("email in update user : ", email);
        const userExists = await userService.findExistingEmail(email);
        if (userExists) {
          return res.status(StatusCodes.CONFLICT).json({ message: "User with this email already exists" });
        } else {
          updateData.isEmailVerified = false;
        }
      }

      if (updateData.phoneNumber) {
        const existingphoneNumber = await userService.findExistingPhoneNumber(updateData.phoneNumber);
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

      // Handle team assignments if provided
      let teamIdsToAssign: string[] = [];
      if (updateData.teamIds && Array.isArray(updateData.teamIds)) {
        teamIdsToAssign = [...updateData.teamIds];
        // Remove teamIds from updateData as it will be handled separately
        delete updateData.teamIds;
      }

      const updatedUser = await userService.updateById(userId, updateData);
      if (!updatedUser) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
      }

      // Update team assignments if provided
      if (teamIdsToAssign.length > 0) {
        await userService.assignTeamsToUser(userId, teamIdsToAssign);
      }
      // console.log("user.email : " , updateData.email , updatedUser.email)
      // if(updateData.email !== updatedUser.email){
      //   updatedUser.isEmailVerified = false;
      // }

      // Handle address updates if provided
      if (addresses && Array.isArray(addresses)) {
        try {
          console.log(`Processing ${addresses.length} addresses from payload`);

          // Get all existing addresses for this user
          const existingAddresses = await userService.findAllAddressesByUserId(userId);
          const existingAddressIds = existingAddresses.map((addr: any) => addr._id.toString());
          console.log(`Found ${existingAddresses.length} existing addresses:`, existingAddressIds);

          // Get IDs of addresses in the payload (only valid ObjectIds)
          const payloadAddressIds = addresses
            .filter((addr) => addr._id && require("mongoose").Types.ObjectId.isValid(addr._id))
            .map((addr) => addr._id.toString());
          console.log(`Payload contains ${payloadAddressIds.length} existing addresses:`, payloadAddressIds);

          // Find addresses that exist in database but not in payload (these should be deleted)
          const addressesToDelete = existingAddressIds.filter((id) => !payloadAddressIds.includes(id));
          console.log(`Addresses to delete:`, addressesToDelete);

          // Delete addresses that were removed from frontend
          for (const addressId of addressesToDelete) {
            try {
              const deletedAddress = await userService.softDeleteAddress(addressId);
              if (deletedAddress) {
                console.log(`Successfully deleted address: ${addressId}`);
              } else {
                console.log(`Address not found for deletion: ${addressId}`);
              }
            } catch (deleteError) {
              console.error(`Error deleting address ${addressId}:`, deleteError);
            }
          }

          // Process addresses in the payload
          for (const addr of addresses) {
            // Validate address data
            if (
              !addr.country ||
              !addr.city ||
              !addr.address ||
              !addr.postalCode ||
              typeof addr.latitude !== "number" ||
              typeof addr.longitude !== "number"
            ) {
              return res.status(StatusCodes.BAD_REQUEST).json({
                message:
                  "Invalid address data. Country, city, address, postal code, latitude, and longitude are required.",
              });
            }

            if (addr._id) {
              // Validate ObjectId format
              const mongoose = require("mongoose");
              if (!mongoose.Types.ObjectId.isValid(addr._id)) {
                console.log(`Invalid ObjectId detected: ${addr._id}, treating as new address`);
                // Treat invalid ObjectId as new address by removing the _id
                const { _id, ...addressWithoutId } = addr;
                const createdAddress = await userService.createAddress(addressWithoutId, userId);
                if (!createdAddress) {
                  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error creating address" });
                }
              } else {
                // Update existing address with valid ObjectId
                const updatedAddress = await userService.findAddressandUpdate(addr._id, {
                  ...addr,
                  isActive: true, // Ensure address remains active
                });
                if (!updatedAddress) {
                  return res.status(StatusCodes.NOT_FOUND).json({ message: "Address not found" });
                }
              }
            } else {
              // Create new address if _id is not present
              const createdAddress = await userService.createAddress(addr, userId);
              if (!createdAddress) {
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error creating address" });
              }
            }
          }

          // Verify final state
          const finalAddresses = await userService.findAllAddressesByUserId(userId);
          console.log(`Final address count for user ${userId}: ${finalAddresses.length}`);
          console.log(
            `Final addresses:`,
            finalAddresses.map((addr) => ({
              id: addr._id,
              address: addr.address,
              isActive: addr.isActive,
            }))
          );
        } catch (addressError) {
          console.error("Error handling addresses:", addressError);
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error processing addresses" });
        }
      }

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "User Updated Successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while updating the user" });
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

  getUsersByRole: async (req: Request, res: Response) => {
    const { role } = req.params;
    const users = await userService.getUsersByRole(role as any);
    res.status(StatusCodes.OK).json({ data: users });
  },

  getUserAddress: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Validate userId parameter
      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "User ID is required" });
      }

      // Find ALL addresses for the given userId (not just one)
      const addresses = await userService.findAllAddressesByUserId(id);

      // Handle case where no addresses are found
      if (!addresses || addresses.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: "No addresses found for this user" });
      }

      // Return all addresses
      return res.status(StatusCodes.OK).json({
        addresses,
        count: addresses.length,
        defaultAddress: addresses.find((addr) => addr.isDefault) || addresses[0],
      });
    } catch (error) {
      console.error("Error fetching user addresses:", error);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "An error occurred while fetching addresses" });
    }
  },

  getUserDetails: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const user = await userService.findUserById(userId, "+password");
      if (!user) return res.status(404).json({ message: "User not found" });

      // Get all addresses for the user
      const addresses = await userService.findAllAddressesByUserId(userId);

      const userWithAddresses = {
        ...user.toObject(),
        addresses: addresses || [],
        addressCount: addresses ? addresses.length : 0,
        defaultAddress: addresses ? addresses.find((addr) => addr.isDefault) : null,
      };

      res.status(StatusCodes.OK).json({ data: userWithAddresses });
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching user details" });
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    try {
      const user = await userService.deleteById(req.params.id);
      if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
      res.status(StatusCodes.OK).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while deleting the user" });
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
      <p>Your account has been ${isBlocked ? "blocked" : "activated"} by the Build-My-Rig admin.</p>
      <p>If you have any questions, please contact support.</p>
    `;

      // Send the email
      if (userEmailAddress) {
        await sendEmail({
          to: userEmailAddress,
          subject: `Your Build-My-Rig Account Has Been ${isBlocked ? "Blocked" : "Activated"}`,
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
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error updating user status" });
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

      const updatedUser = await userService.updatePermission(additionalAccessRights, restrictedAccessRights, id);
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
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching user statistics" });
    }
  },

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

      console.log("filtersfilters : ", filters);

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

  // Additional address management methods
  deleteUserAddress: async (req: Request, res: Response) => {
    try {
      const { userId, addressId } = req.params;

      // Validate parameters
      if (!userId || !addressId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "User ID and Address ID are required",
        });
      }

      // Check if user has more than one address
      const userAddresses = await userService.findAllAddressesByUserId(userId);
      if (userAddresses.length <= 1) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Cannot delete the last address. User must have at least one address.",
        });
      }

      // Soft delete the address
      const deletedAddress = await userService.softDeleteAddress(addressId);
      if (!deletedAddress) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Address not found",
        });
      }

      res.status(StatusCodes.OK).json({
        message: "Address deleted successfully",
        deletedAddress,
      });
    } catch (error) {
      console.error("Error deleting address:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error deleting address",
      });
    }
  },

  setDefaultAddress: async (req: Request, res: Response) => {
    try {
      const { userId, addressId } = req.params;

      // Validate parameters
      if (!userId || !addressId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "User ID and Address ID are required",
        });
      }

      // Set the address as default
      const updatedAddress = await userService.setDefaultAddress(addressId, userId);
      if (!updatedAddress) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Address not found",
        });
      }

      res.status(StatusCodes.OK).json({
        message: "Default address updated successfully",
        defaultAddress: updatedAddress,
      });
    } catch (error) {
      console.error("Error setting default address:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error setting default address",
      });
    }
  },

  addUserAddress: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const addressData = req.body;

      // Validate parameters
      if (!userId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "User ID is required",
        });
      }

      // Validate address data
      if (!addressData.country || !addressData.city || !addressData.address || !addressData.postalCode) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Country, city, address, and postal code are required",
        });
      }

      // Check if user already has 3 addresses (limit)
      const userAddresses = await userService.findAllAddressesByUserId(userId);
      if (userAddresses.length >= 3) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Maximum 3 addresses allowed per user",
        });
      }

      // Create the address
      const createdAddress = await userService.createAddress(addressData, userId);
      if (!createdAddress) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          message: "Error creating address",
        });
      }

      res.status(StatusCodes.CREATED).json({
        message: "Address added successfully",
        address: createdAddress,
      });
    } catch (error) {
      console.error("Error adding address:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error adding address",
      });
    }
  },

  // Profile Completion Methods
  updateProfileCompletion: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const profileData = req.body as ProfileCompletionPayload;

      console.log("profileDataprofileData sdsdsdsd : ", profileData);

      // Validate user exists
      const existingUser = await userService.findUserById(userId);
      if (!existingUser) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
      }

      // Update profile completion
      const updatedUser = await userService.updateProfileCompletion(userId, profileData);

      if (!updatedUser) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error updating profile completion" });
      }

      // Check if this is a complete profile submission or step-by-step update
      const isCompleteSubmission =
        profileData.jobTitle &&
        profileData.employmentStartDate &&
        profileData.niNumber &&
        profileData.annualLeaveEntitlement !== undefined &&
        profileData.annualLeaveCarriedForward !== undefined &&
        profileData.annualLeaveYear !== undefined;

      res.status(StatusCodes.OK).json({
        message: isCompleteSubmission ? "Profile completion updated successfully" : "Profile data saved successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating profile completion:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error updating profile completion" });
    }
  },

  getProfileCompletionStatus: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;

      // Validate user exists
      const existingUser = await userService.findUserById(userId);
      if (!existingUser) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
      }

      const profileStatus = await userService.getProfileCompletionStatus(userId);

      console.log("profileStatus in contoleer : ", profileStatus);

      if (!profileStatus) {
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: "Error fetching profile completion status" });
      }

      res.status(StatusCodes.OK).json({
        message: "Profile completion status retrieved successfully",
        data: profileStatus,
      });
    } catch (error) {
      console.error("Error getting profile completion status:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error getting profile completion status" });
    }
  },

  assignTeams: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const { teams } = req.body;

      if (!Array.isArray(teams)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Teams must be provided as an array of IDs",
        });
      }

      const updatedUser = await userService.assignTeamsToUser(userId, teams);
      if (!updatedUser) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "User not found",
        });
      }

      res.status(StatusCodes.OK).json({
        message: "Teams assigned successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error assigning teams:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error assigning teams",
      });
    }
  },

  getUserWithTeams: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const user = await userService.getUserWithTeams(userId);

      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "User not found",
        });
      }

      res.status(StatusCodes.OK).json({
        message: "User with teams retrieved successfully",
        data: user,
      });
    } catch (error) {
      console.error("Error fetching user with teams:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error fetching user with teams",
      });
    }
  },

  removeTeam: async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const teamId = req.params.teamId;

      const updatedUser = await userService.removeTeamFromUser(userId, teamId);
      if (!updatedUser) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "User or team not found",
        });
      }

      res.status(StatusCodes.OK).json({
        message: "Team removed successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error removing team from user:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error removing team from user",
      });
    }
  },
};

// new route to get Employee List
