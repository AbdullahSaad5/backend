import { Address, User, UserCategory } from "@/models";
import { IUser, UserCreatePayload, UserUpdatePayload, ProfileCompletionPayload } from "@/contracts/user.contract";
import { createHash } from "@/utils/hash.util";
import { IUserAddress } from "@/contracts/user-address.contracts";
import { Types } from "mongoose";
import { toUpper } from "lodash";

// Function to generate unique Employee ID
const generateUniqueEmployeeId = async (): Promise<string> => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let employeeId = "";
  let isUnique = false;

  while (!isUnique) {
    // Generate a 6-character alphanumeric string
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
      randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Add BMR- prefix
    employeeId = `BMR-${randomPart}`;

    // Check if this Employee ID already exists
    const existingUser = await User.findOne({ employeeId });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return employeeId;
};

export const userService = {
  getAllUsers: async () => {
    return await User.find().populate("userType");
  },
  getUsersByRole: async (role: string) => {
    return await User.find({ userType: role }).populate("userType");
  },
  findUserById: async (id: string, select?: string) => {
    if (select) {
      return await User.findById(id)
        .populate("userType")
        .populate({
          path: "teamAssignments.teamId",
          populate: {
            path: "userCategoryId",
            select: "role description",
          },
        })
        .select(select);
    } else {
      return await User.findById(id)
        .populate("userType")
        .populate({
          path: "teamAssignments.teamId",
          populate: {
            path: "userCategoryId",
            select: "role description",
          },
        });
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
      teamIds,
      isSupervisor,
      supervisorTeamIds,
    } = data;

    const hashedPassword = await createHash(password);

    // Fetch the user category
    const userCategory = await UserCategory.findById(userType);

    let supplierKey = undefined;
    if (userCategory && userCategory.role.toLowerCase() === "supplier") {
      supplierKey = await generateUniqueSupplierKey(firstName, lastName);
    }

    // Generate unique Employee ID for non-customer categories
    let employeeId: string | undefined = undefined;
    if (!userCategory || userCategory.role.toLowerCase() !== "customer") {
      employeeId = await generateUniqueEmployeeId();
    }

    // Process team assignments
    const teamAssignments = [];
    if (teamIds && teamIds.length > 0) {
      for (let i = 0; i < teamIds.length; i++) {
        teamAssignments.push({
          teamId: new Types.ObjectId(teamIds[i]),
          priority: i + 1, // First selected = priority 1 (primary), second = priority 2, etc.
          assignedAt: new Date(),
        });
      }
    }

    // Process supervisor teams
    const supervisorTeams = [];
    if (isSupervisor && supervisorTeamIds && supervisorTeamIds.length > 0) {
      for (let i = 0; i < supervisorTeamIds.length; i++) {
        supervisorTeams.push({
          teamId: new Types.ObjectId(supervisorTeamIds[i]),
          assignedAt: new Date(),
        });
      }
    }

    // Validation: If user is supervisor, they must have at least one supervisor team
    if (isSupervisor && (!supervisorTeamIds || supervisorTeamIds.length === 0)) {
      throw new Error("Supervisor must be assigned to at least one team");
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      userType,
      additionalAccessRights,
      restrictedAccessRights,
      phoneNumber,
      dob,
      supplierKey, // Ensure supplierKey is set
      ...(employeeId ? { employeeId } : {}), // Add the generated Employee ID only for non-customer
      teamAssignments, // Add team assignments
      isSupervisor: isSupervisor || false, // Add supervisor status
      supervisorTeams, // Add supervisor teams
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
    const updateUser = User.findByIdAndUpdate(id, { isBlocked: isBlocked }, { new: true });
    if (!updateUser) {
      throw new Error("User not found");
    }
    return updateUser;
  },

  // Profile Completion Methods
  updateProfileCompletion: async (userId: string, profileData: ProfileCompletionPayload) => {
    try {
      // Convert date strings to Date objects if provided
      const updateData: any = { ...profileData };

      console.log("updateData last and agaonn : ", updateData);

      if (profileData.passportExpiryDate) {
        updateData.passportExpiryDate = new Date(profileData.passportExpiryDate);
      }

      if (profileData.visaExpiryDate) {
        updateData.visaExpiryDate = new Date(profileData.visaExpiryDate);
      }

      if (profileData.employmentStartDate) {
        updateData.employmentStartDate = new Date(profileData.employmentStartDate);
      }

      if (profileData.dob) {
        updateData.dob = new Date(profileData.dob);
      }

      // Handle empty strings - convert to null/undefined for optional fields
      if (updateData.gender === "") updateData.gender = undefined;
      if (updateData.jobTitle === "") updateData.jobTitle = undefined;
      if (updateData.employmentStartDate === "") updateData.employmentStartDate = undefined;
      if (updateData.niNumber === "") updateData.niNumber = undefined;
      if (updateData.emergencyPhoneNumber === "") updateData.emergencyPhoneNumber = undefined;
      if (updateData.countryOfIssue === "") updateData.countryOfIssue = undefined;
      if (updateData.passportNumber === "") updateData.passportNumber = undefined;
      if (updateData.visaNumber === "") updateData.visaNumber = undefined;

      // Clear visa-related fields if user is British National/ILR
      if (updateData.rightToWorkType === "british_national_ilr") {
        updateData.countryOfIssue = undefined;
        updateData.visaNumber = undefined;
        updateData.visaExpiryDate = undefined;
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
      }).populate("userType");

      return updatedUser;
    } catch (error) {
      console.error("Error updating profile completion:", error);
      throw error;
    }
  },

  calculateProfileCompletion: async (userId: string, profileData?: any) => {
    try {
      let user = profileData;

      if (!user) {
        user = await User.findById(userId);
        if (!user) return 0;
      }

      // Base fields that apply to all users (11 fields - moved NI Number to documents)
      const baseFields = 11;
      // Documents and Right to work specific fields (4 fields - including NI Number)
      const documentsFields = 4;

      // Calculate total fields based on user type
      const totalFields = baseFields + documentsFields;
      let completedFields = 0;

      // Personal Information (4 fields)
      if (user.gender) completedFields++;
      if (user.emergencyPhoneNumber) completedFields++;
      if (user.profileImage) completedFields++;
      if (user.dob) completedFields++;

      // Geofencing Configuration (2 fields)
      if (user.geofencingRadius !== undefined) completedFields++;
      if (user.geofencingAttendanceEnabled !== undefined) completedFields++;

      // Employment Information (2 fields - removed NI Number)
      if (user.jobTitle) completedFields++;
      if (user.employmentStartDate) completedFields++;

      // Annual Leave Configuration (3 fields)
      if (user.annualLeaveEntitlement !== undefined) completedFields++;
      if (user.annualLeaveCarriedForward !== undefined) completedFields++;
      if (user.annualLeaveYear !== undefined) completedFields++;

      // Documents and Right to Work Information (4 fields - including NI Number)
      if (user.niNumber) completedFields++;
      if (user.passportNumber && user.passportExpiryDate) completedFields++;
      if (user.employmentDocuments && user.employmentDocuments.length > 0) completedFields++;
      if (user.rightToWorkType === "visa_holder" && user.visaNumber && user.visaExpiryDate) {
        completedFields++;
      } else if (user.rightToWorkType === "british_national_ilr") {
        completedFields++;
      }
      // Note: If not foreign user, we don't add these fields to either completed or total

      return Math.round((completedFields / totalFields) * 100);
    } catch (error) {
      console.error("Error calculating profile completion:", error);
      return 0;
    }
  },

  getProfileCompletionStatus: async (userId: string) => {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      const completionPercentage = await userService.calculateProfileCompletion(userId, user.toObject());

      const profileCompleted = completionPercentage === 100;

      // Update user with calculated values
      user.profileCompletionPercentage = completionPercentage;
      user.profileCompleted = profileCompleted;

      // Save the updated user
      await user.save();

      return {
        profileCompleted: profileCompleted || false,
        profileCompletionPercentage: completionPercentage,
        missingFields: await userService.getMissingProfileFields(userId, user.toObject()),
      };
    } catch (error) {
      console.error("Error getting profile completion status:", error);
      throw error;
    }
  },

  getMissingProfileFields: async (userId: string, userData?: any) => {
    try {
      let user = userData;

      if (!user) {
        user = await User.findById(userId);
        if (!user) return [];
      }

      const missingFields = [];

      // Personal Information
      if (!user.gender) missingFields.push("Gender");
      if (!user.emergencyPhoneNumber) missingFields.push("Emergency Phone Number");
      if (!user.profileImage) missingFields.push("Profile Image");
      if (!user.dob) missingFields.push("Date of Birth");

      // Geofencing Configuration
      if (user.geofencingRadius === undefined) missingFields.push("Geofencing Radius");
      if (user.geofencingAttendanceEnabled === undefined) missingFields.push("Geofencing Attendance");

      // Employment Information
      if (!user.jobTitle) missingFields.push("Job Title");
      if (!user.employmentStartDate) missingFields.push("Employment Start Date");

      // Annual Leave Configuration
      if (user.annualLeaveEntitlement === undefined) missingFields.push("Annual Leave Entitlement");
      if (user.annualLeaveCarriedForward === undefined) missingFields.push("Annual Leave Carried Forward");
      if (user.annualLeaveYear === undefined) missingFields.push("Annual Leave Year");

      // Documents and Right to Work Information
      if (!user.niNumber) missingFields.push("NI Number");
      if (!user.passportNumber || !user.passportExpiryDate) {
        missingFields.push("Passport Information");
      }
      if (!user.employmentDocuments || user.employmentDocuments.length === 0) {
        missingFields.push("Employment Documents");
      }
      if (user.rightToWorkType === "visa_holder") {
        if (!user.countryOfIssue) missingFields.push("Country of Issue");
        if (!user.visaNumber || !user.visaExpiryDate) {
          missingFields.push("Visa Information");
        }
      }

      return missingFields;
    } catch (error) {
      console.error("Error getting missing profile fields:", error);
      return [];
    }
  },

  createAddress: async (addressData: any, userId: string) => {
    const {
      country,
      address,
      county,
      appartment,
      city,
      postalCode,
      isDefault = false,
      longitude,
      latitude,
    } = addressData;

    // If this is set as default, make sure no other address is default for this user
    if (isDefault) {
      await Address.updateMany({ userId, isActive: true }, { isDefault: false });
    }

    const newAddress = new Address({
      userId,
      county,
      address,
      city,
      appartment,
      postalCode,
      country,
      isDefault,
      isActive: true,
      longitude,
      latitude,
    });
    return newAddress.save();
  },

  createMultipleAddresses: async (addresses: any[], userId: string) => {
    const createdAddresses = [];
    for (let i = 0; i < addresses.length; i++) {
      const addressData = {
        ...addresses[i],
        isDefault: i === 0, // Make first address default
      };
      const createdAddress = await userService.createAddress(addressData, userId);
      createdAddresses.push(createdAddress);
    }
    return createdAddresses;
  },

  findAddressandUpdate: (id: string, address: IUserAddress) => {
    return Address.findByIdAndUpdate(id, address, { new: true });
  },

  findAddressByUserId: (userId: string) => {
    return Address.find({ userId: userId, isActive: true }).sort({
      isDefault: -1,
      createdAt: 1,
    });
  },

  findAllAddressesByUserId: (userId: string) => {
    return Address.find({ userId: userId, isActive: true }).sort({
      isDefault: -1,
      createdAt: 1,
    });
  },

  softDeleteAddress: async (addressId: string) => {
    return Address.findByIdAndUpdate(addressId, { isActive: false }, { new: true });
  },

  setDefaultAddress: async (addressId: string, userId: string) => {
    // First, remove default from all addresses for this user
    await Address.updateMany({ userId, isActive: true }, { isDefault: false });

    // Then set the specified address as default
    return Address.findByIdAndUpdate(addressId, { isDefault: true }, { new: true });
  },

  updatePermission: (additionalAccessRights: string[], restrictedAccessRights: string[], id: string) => {
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
        userType,
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

      // Always exclude super admin, admin, and supplier users from the results
      const excludedRoles = ["super admin", "supplier"];
      const excludedUserTypes = await UserCategory.find({
        role: { $in: excludedRoles },
      });
      const excludedUserTypeIds = excludedUserTypes.map((cat) => cat._id);

      if (excludedUserTypeIds.length > 0) {
        query.userType = { $nin: excludedUserTypeIds };
      }

      if (searchQuery) {
        console.log("Searching for:", searchQuery);

        // First, try to find user categories that match the search query
        const matchingCategories = await UserCategory.find({
          role: { $regex: searchQuery, $options: "i" },
        });

        const categoryIds = matchingCategories.map((cat) => cat._id);
        console.log(
          "Found matching categories:",
          matchingCategories.map((cat) => cat.role)
        );
        console.log("Category IDs:", categoryIds);

        query.$or = [
          { firstName: { $regex: searchQuery, $options: "i" } },
          { lastName: { $regex: searchQuery, $options: "i" } },
          { email: { $regex: searchQuery, $options: "i" } },
          { phoneNumber: { $regex: searchQuery, $options: "i" } },
          { jobTitle: { $regex: searchQuery, $options: "i" } },
          { supplierKey: { $regex: searchQuery, $options: "i" } },
          { niNumber: { $regex: searchQuery, $options: "i" } },
          { taxId: { $regex: searchQuery, $options: "i" } },
          { employeeId: { $regex: searchQuery, $options: "i" } },
        ];

        // Add combined name search for full name searches
        // This will match when someone searches for "Hammad Zamir" or similar combined names
        const searchTerms = searchQuery.trim().split(/\s+/);
        if (searchTerms.length > 1) {
          console.log("Multiple search terms detected:", searchTerms);

          // If search query has multiple words, try to match them as first and last name combinations
          query.$or.push({
            $and: [
              { firstName: { $regex: searchTerms[0], $options: "i" } },
              {
                lastName: {
                  $regex: searchTerms[searchTerms.length - 1],
                  $options: "i",
                },
              },
            ],
          });

          // Also try reverse order (last name first, then first name)
          if (searchTerms.length === 2) {
            query.$or.push({
              $and: [
                { firstName: { $regex: searchTerms[1], $options: "i" } },
                { lastName: { $regex: searchTerms[0], $options: "i" } },
              ],
            });
          }

          console.log("Added combined name search for:", searchTerms);
        }

        // If we found matching categories, add them to the search
        if (categoryIds.length > 0) {
          // Filter out excluded categories from search results
          const allowedCategoryIds = categoryIds.filter(
            (id) => !excludedUserTypeIds.some((excludedId) => excludedId.toString() === id.toString())
          );
          if (allowedCategoryIds.length > 0) {
            query.$or.push({ userType: { $in: allowedCategoryIds } });
          }
        }
      }

      if (isBlocked !== undefined) {
        query.isBlocked = isBlocked;
      }

      if (userType) {
        console.log("Filtering by userType:", userType);
        // Find the user category by role name
        const userCategory = await UserCategory.findOne({ role: userType });
        if (userCategory) {
          // If we already have a userType filter (from excluded roles), we need to combine them
          if (query.userType && query.userType.$nin) {
            // We have excluded roles, so we need to ensure the selected userType is not in the excluded list
            // and also match the specific userType
            query.$and = [{ userType: { $nin: excludedUserTypeIds } }, { userType: userCategory._id }];
            delete query.userType;
          } else {
            query.userType = userCategory._id;
          }
          console.log("Found user category:", userCategory._id);
        } else {
          console.log("No user category found for role:", userType);
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
      const users = await User.find(query)
        .populate("userType")
        .populate({
          path: "teamAssignments.teamId",
          populate: {
            path: "userCategoryId",
            select: "role description",
          },
        })
        .populate({
          path: "supervisorTeams.teamId",
          populate: {
            path: "userCategoryId",
            select: "role description",
          },
        })
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

  // Team Assignment Methods
  assignTeamsToUser: async (userId: string, teamIds: string[]) => {
    try {
      const teamAssignments = teamIds.map((teamId, index) => ({
        teamId: new Types.ObjectId(teamId),
        priority: index + 1,
        assignedAt: new Date(),
      }));

      const updatedUser = await User.findByIdAndUpdate(userId, { teamAssignments }, { new: true })
        .populate("userType")
        .populate("teamAssignments.teamId");

      return updatedUser;
    } catch (error) {
      console.error("Error assigning teams to user:", error);
      throw error;
    }
  },

  getUserWithTeams: async (userId: string) => {
    try {
      const user = await User.findById(userId)
        .populate("userType")
        .populate({
          path: "teamAssignments.teamId",
          populate: {
            path: "userCategoryId",
            select: "role description",
          },
        });

      return user;
    } catch (error) {
      console.error("Error fetching user with teams:", error);
      throw error;
    }
  },

  getUsersByTeam: async (teamId: string) => {
    try {
      const users = await User.find({
        "teamAssignments.teamId": new Types.ObjectId(teamId),
      })
        .populate("userType")
        .populate("teamAssignments.teamId")
        .sort({ "teamAssignments.priority": 1 });

      return users;
    } catch (error) {
      console.error("Error fetching users by team:", error);
      throw error;
    }
  },

  removeTeamFromUser: async (userId: string, teamId: string) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Remove the team assignment
      user.teamAssignments = user.teamAssignments.filter((assignment) => assignment.teamId.toString() !== teamId);

      // Reorder priorities
      user.teamAssignments.forEach((assignment, index) => {
        assignment.priority = index + 1;
      });

      await user.save();
      return await userService.getUserWithTeams(userId);
    } catch (error) {
      console.error("Error removing team from user:", error);
      throw error;
    }
  },
};

export async function generateUniqueSupplierKey(firstName: string, lastName: string): Promise<string> {
  let baseKey = `${toUpper(firstName)}_${toUpper(lastName)}`;
  let uniqueKey = baseKey;
  let counter = 1;

  // Check if the key already exists and increment counter if needed
  while (await User.exists({ supplierKey: uniqueKey })) {
    uniqueKey = `${baseKey}_${counter}`;
    counter++;
  }

  return uniqueKey;
}
