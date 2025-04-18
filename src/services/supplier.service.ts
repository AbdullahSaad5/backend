import { supplierAddPayload } from "@/contracts/supplier.contract";
import { ISupplierAddress } from "@/contracts/supplier.contract";
import { IFile } from "@/contracts/user.contract";
import { User } from "@/models";
import { Address } from "@/models";
import { UserCategory } from "@/models";
import { createHash } from "@/utils/hash.util";
import mongoose, { Types } from "mongoose";
import { generateUniqueSupplierKey } from "./user.service";
export const supplierService = {
  findExistingEmail: async (email: string) => {
    const userExists = await User.findOne({ email });
    return userExists;
  },

  findExistingPhoneNumber: (phoneNumber: number) => {
    return User.findOne({ phoneNumber });
  },

  createSupplier: async (data: supplierAddPayload) => {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      additionalDocuments,
      supplierCategory,
    } = data;

    const hashedPassword = await createHash(password);

    // Find supplier userType from UserCategory
    const supplierCategoryDoc = await UserCategory.findOne({ role: "supplier" });

    if (!supplierCategoryDoc) {
      throw new Error("Supplier user type not found in UserCategory.");
    }

    const userType = supplierCategoryDoc._id; // Hardcoded userType as "supplier"

    // Generate unique supplier key
    const supplierKey = await generateUniqueSupplierKey(firstName, lastName);

    // Create the new supplier
    const supplier = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phoneNumber,
      supplierCategory,
      userType, // Ensuring userType is set as "supplier"
      additionalDocuments,
      supplierKey, // Ensure supplierKey is generated and added
    });

    return supplier.save();
  },


  createAddress: (address: ISupplierAddress) => {
    const newAddress = new Address(address);
    return newAddress.save();
  },

  getAllSuppliers: () => {
    return User.aggregate([
      {
        // Join with the 'usercategories' collection to get the supplier type details
        $lookup: {
          from: "usercategories",
          localField: "userType",
          foreignField: "_id",
          as: "userType",
        },
      },
      {
        // Flatten the 'userType' array into an object
        // $unwind: "$userType",
        $unwind: {
          path: "$userType",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Join with the 'suppliercategories' collection to get the supplier category details
        $lookup: {
          from: "suppliercategories",
          localField: "supplierCategory",
          foreignField: "_id",
          as: "supplierCategory",
        },
      },
      {
        $unwind: {
          path: "$supplierCategory",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Match only users where the userType role is "Supplier"
        $match: {
          "userType.role": "supplier",
        },
      },
      {
        // Join with the 'addresses' collection to get the addresses associated with the supplier
        $lookup: {
          from: "addresses",
          localField: "_id",
          foreignField: "userId",
          as: "addresses",
        },
      },
    ]);
  },

  findSupplierById: async (id: string, select?: string) => {
    if (select) {
      return await User.findById(id)
        .populate("supplierCategory")
        .populate("userType")
        .select(select);
    } else {
      return await User.findById(id)
        .populate("supplierCategory")
        .populate("userType");
    }
  },

  updateById: (id: string, data: Partial<supplierAddPayload>) => {
    const updatedSupplier = User.findByIdAndUpdate(id, data, { new: true });
    return updatedSupplier;
  },

  findAddressByUserId: (userId: string) => {
    return Address.find({ userId: userId });
  },

  findAddressAndUpdate: (id: string, address: ISupplierAddress) => {
    return Address.findByIdAndUpdate(id, address, { new: true });
  },

  deleteById: async (id: string) => {
    return await User.findByIdAndDelete(id);
  },

  toggleBlock: (id: string, isBlocked: boolean) => {
    const updateSupplier = User.findByIdAndUpdate(
      id,
      { isBlocked: isBlocked },
      { new: true }
    );
    if (!updateSupplier) {
      throw new Error("User not found");
    }
    return updateSupplier;
  },
  // New API for fetching supplier stats (separate service logic)
  getSupplierStats: async () => {
    try {
      const totalSuppliers = await User.countDocuments({
        userType: new Types.ObjectId("6749ad51ee2cd751095fb5f3"),
      });
      const activeSuppliers = await User.countDocuments({
        isBlocked: false,
        userType: new Types.ObjectId("6749ad51ee2cd751095fb5f3"),
      });
      const blockedSuppliers = await User.countDocuments({
        isBlocked: true,
        userType: new Types.ObjectId("6749ad51ee2cd751095fb5f3"),
      });

      return { totalSuppliers, activeSuppliers, blockedSuppliers };
    } catch (error) {
      console.error("Error fetching supplier stats:", error);
      throw new Error("Error fetching supplier statistics");
    }
  },

  searchAndFilterSuppliers: async (filters: any) => {
    try {
      const {
        searchQuery = "",
        isBlocked,
        startDate,
        endDate,
        additionalAccessRights,
        page = 1, // Default to page 1 if not provided
        limit = 10, // Default to 10 records per page
      } = filters;

      // Convert page and limit to numbers
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      // Build the query dynamically based on filters
      const query: any = {
        //TODO: confusion here regarding query
        userType: new Types.ObjectId("6749ad51ee2cd751095fb5f3")
      };

      if (searchQuery) {
        query.$or = [
          { firstName: { $regex: searchQuery, $options: "i" } },
          { lastName: { $regex: searchQuery, $options: "i" } },
          { email: { $regex: searchQuery, $options: "i" } },
        ];
      }

      if (isBlocked !== undefined) {
        query.isBlocked = isBlocked;
      }

      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        query.createdAt = dateFilter;
      }

      if (additionalAccessRights) {
        query.additionalAccessRights = { $in: additionalAccessRights };
      }

      // Pagination logic: apply skip and limit
      const suppliers = await User.find(query)
        .populate("userType")
        .skip(skip) // Correct application of skip
        .limit(limitNumber); // Correct application of limit

      // Count total Suppliers
      const totalSuppliers = await User.countDocuments({
        userType: new Types.ObjectId("6749ad51ee2cd751095fb5f3"),
      });

      return {
        suppliers,
        pagination: {
          totalSuppliers,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalSuppliers / limitNumber),
          perPage: limitNumber,
        },
      };
    } catch (error) {
      console.error("Error during search and filter:", error);
      throw new Error("Error during search and filter");
    }
  },
};
