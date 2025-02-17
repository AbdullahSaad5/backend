import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { supplierService } from "@/services";
import { IUserAddress } from "@/contracts/user-address.contracts";
import { createHash } from "@/utils/hash.util";
import { UserCategory } from "@/models";
import sendEmail from "@/utils/nodeMailer";

export const supplierController = {
  addSupplier: async (req: Request, res: Response) => {
    try {
      const { email, address, password } = req.body;

      console.log("add supplier : ", req.body);

      const userExists = await supplierService.findExistingEmail(email);
      if (userExists) {
        return res
          .status(StatusCodes.CONFLICT)
          .json({ message: "Supplier with this email already exists" });
      }

      if (req.body.phoneNumber) {
        const existingPhoneNumber =
          await supplierService.findExistingPhoneNumber(req.body.phoneNumber);
        if (existingPhoneNumber) {
          return res.status(StatusCodes.CONFLICT).json({
            message: "User with this phone number already exists! Try another",
          });
        }
      }

      // Create the user (supplier)
      const supplier = await supplierService.createSupplier(req.body);
      if (!supplier) {
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: "Error creating supplier" });
      }

      // Handle address update/addition if provided
      if (address && Array.isArray(address)) {
        for (const addr of address) {
          const createdAddress = await supplierService.createAddress({
            ...addr,
            userId: supplier._id,
          });
          if (!createdAddress) {
            return res.json({ message: "Error creating address" });
          }
        }
      }

      // Send email to the new supplier
      try {
        const emailContent = `
        <p>Dear ${supplier.firstName || "supplier"},</p>
        <p>Your account has been created by the Bav-IT admin. Below are your login credentials:</p>
        <p><strong>Email:</strong> ${supplier.email}</p>
        <p><strong>Password:</strong> ${password}</p>
      `;

        await sendEmail({
          to: supplier.email,
          subject: "Your Bav-IT Supplier Account Has Been Created",
          html: emailContent,
        });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Log the email failure but continue to return a success response
      }

      // Send a response back to the client
      res.status(StatusCodes.CREATED).json({
        message: "Supplier created successfully, and email notification sent.",
        supplier: supplier,
      });
    } catch (error) {
      console.error(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error creating user" });
    }
  },

  editSupplier: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      const { address } = updateData;

      if (updateData.email) {
        const email = updateData.email;
        const userExists = await supplierService.findExistingEmail(email);
        if (userExists) {
          return res
            .status(StatusCodes.CONFLICT)
            .json({ message: "User with this email already exists" });
        } else {
          updateData.isEmailVerified = false;
        }
      }

      if (updateData.phoneNumber) {
        const existingPhoneNumber =
          await supplierService.findExistingPhoneNumber(updateData.phoneNumber);
        if (existingPhoneNumber) {
          return res.status(StatusCodes.CONFLICT).json({
            message:
              "Supplier with this phone number already exists! Try another",
          });
        }
      }

      if (updateData.password) {
        updateData.password = await createHash(updateData.password);
      }

      const updatedSupplier = await supplierService.updateById(
        userId,
        updateData
      );
      if (!updatedSupplier) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "User not found" });
      }

      // Handle address updates if provided
      if (address && Array.isArray(address)) {
        for (const addr of address) {
          if (addr._id) {
            // Update existing address
            const updatedAddress = await supplierService.findAddressAndUpdate(
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
            const createdAddress = await supplierService.createAddress({
              ...addr,
              userId,
            });
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
        message: ReasonPhrases.OK,
        data: updatedSupplier,
      });
    } catch (error) {
      console.error("Error updating supplier:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "An error occurred while updating the user" });
    }
  },

  getSuppliers: async (req: Request, res: Response) => {
    try {
      // const categories = await UserCategory.findOne({})
      const allSuppliers = await supplierService.getAllSuppliers();
      // console.log(allSuppliers);
      res.status(StatusCodes.OK).json({ data: allSuppliers });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error });
    }
  },

  getSupplierById: async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const supplier = await supplierService.findSupplierById(id, "+password");
      if (!supplier)
        return res.status(404).json({ message: "Supplier not found" });
      const address = await supplierService.findAddressByUserId(id);

      const supplierWithAddresses = { ...supplier.toObject(), address };

      res.status(200).json({ data: supplierWithAddresses });
    } catch (error) {
      console.error(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching supplier details" });
    }
  },

  deleteSupplier: async (req: Request, res: Response) => {
    try {
      const supplier = await supplierService.deleteById(req.params.id);
      if (!supplier)
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "User not found" });
      res
        .status(StatusCodes.OK)
        .json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "An error occurred while deleting the supplier" });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const { isBlocked } = req.body;
      const result = await supplierService.toggleBlock(userId, isBlocked);
      const userEmailAddress = result?.email;
      const userName = result?.firstName || "User";

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
        message: `Supplier ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: result,
      });
    } catch (error) {
      console.error("Toggle Block Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error updating supplier status" });
    }
  },
  // New API for user stats Widgets

  getSupplierStats: async (req: Request, res: Response) => {
    try {
      const stats = await supplierService.getSupplierStats();
      return res.status(StatusCodes.OK).json(stats);
    } catch (error) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching supplier statistics" });
    }
  },
  searchAndFilterSuppliers: async (req: Request, res: Response) => {
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

      // Call the service to search and filter the suppliers
      const suppliers = await supplierService.searchAndFilterSuppliers(filters);

      // Return the results
      res.status(200).json({
        success: true,
        message: "Search and filter completed successfully",
        data: suppliers,
      });
    } catch (error) {
      console.error("Error in search and filter:", error);
      res.status(500).json({
        success: false,
        message: "Error in search and filter suppliers",
      });
    }
  },
};
