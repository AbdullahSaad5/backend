import { Address, User, UserCategory } from "@/models";
import {
  IUser,
  UserCreatePayload,
  UserUpdatePayload,
} from "@/contracts/user.contract";
import { createHash } from "@/utils/hash.util";
import { IUserAddress } from "@/contracts/user-address.contracts";
import { Types } from "mongoose";

export const userService = {
  getAllUsers: async () => {
    return await User.find().populate("userType");
  },

  findUserById: async (id: string, select?: string) => {
    if (select) {
      return await User.findById(id).populate("userType").select(select);
    } else {
      return await User.findById(id).populate("userType");
    }
  },

  findCategoryById: async (id: string) => {
    return await UserCategory.findById(id);
  },

  createUser: async (data: UserCreatePayload) => {
    const {
      firstName,
      lastName,
      email,
      password,
      userType,
      additionalAccessRights,
      restrictedAccessRights,
      phoneNumber,
      dob,
      //   address,
    } = data;
    // console.log(data);
    const hasedPassword = await createHash(password);
    const newUser = await new User({
      firstName,
      lastName,
      email,
      password: hasedPassword,
      userType,
      additionalAccessRights,
      restrictedAccessRights,
      phoneNumber,
      dob,
    });
    return await newUser.save();
  },

  findExistingEmail: async (email: string) => {
    const userExists = await User.findOne({ email });
    return userExists;
  },

  findExistingPhoneNumber: (phoneNumber: number) => {
    return User.findOne({ phoneNumber });
  },

  updateById: async (userId: string, updateData: UserUpdatePayload) => {
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });
    return updatedUser;
  },

  deleteById: async (id: string) => {
    return await User.findByIdAndDelete(id);
  },

  toggleBlock: (id: string, isBlocked: boolean) => {
    const updateUser = User.findByIdAndUpdate(
      id,
      { isBlocked: isBlocked },
      { new: true }
    );
    if (!updateUser) {
      throw new Error("User not found");
    }
    return updateUser;
  },

  createAddress: (addresss: IUserAddress, userId: string) => {
    const { country, address, label, appartment, city, postalCode, isDefault } =
      addresss;
    const newAddress = new Address({
      userId,
      label,
      address,
      city,
      appartment,
      postalCode,
      country,
      isDefault,
    });
    return newAddress.save();
  },

  findAddressandUpdate: (id: string, address: IUserAddress) => {
    return Address.findByIdAndUpdate(id, address, { new: true });
  },

  findAddressByUserId: (userId: string) => {
    return Address.find({ userId: userId });
  },

  updatePermission: (
    additionalAccessRights: string[],
    restrictedAccessRights: string[],
    id: string
  ) => {
    console.log("id : ", id);
    console.log("additionalAccessRights : ", additionalAccessRights);
    console.log("restrictedAccessRights : ", restrictedAccessRights);

    return User.findByIdAndUpdate(id, {
      additionalAccessRights: additionalAccessRights,
      restrictedAccessRights: restrictedAccessRights,
    });
  },
  // New API for fetching user stats (separate service logic)
  getUserStats: async () => {
    try {
      const totalUsers = await User.countDocuments();
      const totalCustomers = await User.countDocuments({
        userType: new Types.ObjectId("675843e9e2c601266bed8319"),
      });
      const activeUsers = await User.countDocuments({ isBlocked: false });
      const blockedUsers = await User.countDocuments({ isBlocked: true });
      return { totalUsers, activeUsers, blockedUsers, totalCustomers };
    } catch (error) {
      console.error("Error fetching user stats:", error);
      throw new Error("Error fetching user statistics");
    }
  },

  searchAndFilterUsers: async (filters: any) => {
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
      const query: any = {};

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
      const users = await User.find(query)
        .populate("userType")
        .skip(skip) // Correct application of skip
        .limit(limitNumber); // Correct application of limit

      // Count total users
      const totalUsers = await User.countDocuments(query);

      return {
        users,
        pagination: {
          totalUsers,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalUsers / limitNumber),
          perPage: limitNumber,
        },
      };
    } catch (error) {
      console.error("Error during search and filter:", error);
      throw new Error("Error during search and filter");
    }
  },
};
