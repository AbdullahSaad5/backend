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
        supplierCategory,
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
      const query: Record<string, any> = {};
      
      // Find the supplier userType dynamically
      const supplierUserType = await UserCategory.findOne({ role: "supplier" });
      if (supplierUserType) {
        query.userType = supplierUserType._id;
        console.log("Found supplier userType:", supplierUserType._id);
      } else {
        console.log("No supplier userType found");
        // Return empty results if no supplier userType exists
        return {
          suppliers: [],
          pagination: {
            totalSuppliers: 0,
            currentPage: pageNumber,
            totalPages: 0,
            perPage: limitNumber,
          },
        };
      }

      if (searchQuery) {
        console.log("Searching for:", searchQuery);
        
        // First, try to find supplier categories that match the search query
        const SupplierCategory = mongoose.model("SupplierCategory");
        const matchingCategories = await SupplierCategory.find({
          name: { $regex: searchQuery, $options: "i" }
        });
        
        const categoryIds = matchingCategories.map(cat => cat._id);
        console.log("Found matching supplier categories:", matchingCategories.map(cat => cat.name));
        console.log("Category IDs:", categoryIds);
        
        const searchConditions: Record<string, any>[] = [
          { firstName: { $regex: searchQuery, $options: "i" } },
          { lastName: { $regex: searchQuery, $options: "i" } },
          { email: { $regex: searchQuery, $options: "i" } },
          { phoneNumber: { $regex: searchQuery, $options: "i" } },
          { jobTitle: { $regex: searchQuery, $options: "i" } },
          { supplierKey: { $regex: searchQuery, $options: "i" } },
          { niNumber: { $regex: searchQuery, $options: "i" } },
        ];
        
        // Add combined name search for full name searches
        // This will match when someone searches for "John Smith" or similar combined names
        const searchTerms = searchQuery.trim().split(/\s+/);
        if (searchTerms.length > 1) {
          console.log("Multiple search terms detected:", searchTerms);
          
          // If search query has multiple words, try to match them as first and last name combinations
          searchConditions.push({
            $and: [
              { firstName: { $regex: searchTerms[0], $options: "i" } },
              { lastName: { $regex: searchTerms[searchTerms.length - 1], $options: "i" } }
            ]
          });
          
          // Also try reverse order (last name first, then first name)
          if (searchTerms.length === 2) {
            searchConditions.push({
              $and: [
                { firstName: { $regex: searchTerms[1], $options: "i" } },
                { lastName: { $regex: searchTerms[0], $options: "i" } }
              ]
            });
          }
          
          console.log("Added combined name search for:", searchTerms);
        }
        
        // If we found matching categories, add them to the search
        if (categoryIds.length > 0) {
          searchConditions.push({ supplierCategory: { $in: categoryIds } });
        }
        
        // Use $and to combine the userType filter with the search conditions
        query.$and = [
          { userType: query.userType },
          { $or: searchConditions }
        ] as Record<string, any>[];
        delete query.userType; // Remove the top-level userType since it's now in $and
      }

      if (isBlocked !== undefined) {
        query.isBlocked = isBlocked;
      }

      if (supplierCategory) {
        console.log("Filtering by supplierCategory:", supplierCategory);
        // Find the supplier category by name
        const SupplierCategory = mongoose.model("SupplierCategory");
        const category = await SupplierCategory.findOne({ name: supplierCategory });
        if (category) {
          query.supplierCategory = category._id;
          console.log("Found supplier category:", category._id);
        } else {
          console.log("No supplier category found for name:", supplierCategory);
        }
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

      console.log("Final query:", JSON.stringify(query, null, 2));

      // Pagination logic: apply skip and limit
      const suppliers = await User.find(query)
        .populate("userType")
        .populate("supplierCategory")
        .skip(skip) // Correct application of skip
        .limit(limitNumber); // Correct application of limit

      console.log("Found suppliers:", suppliers.length);
      console.log("Sample supplier:", suppliers[0]);

      // Count total Suppliers using the same query without pagination
      const totalSuppliers = await User.countDocuments(query);

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
