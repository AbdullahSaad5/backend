import { User, UserCategory } from "@/models";
import { Types } from "mongoose";

export interface UserAnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalCustomers: number;
  totalSuppliers: number;
  emailVerifiedUsers: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  newSuppliersThisMonth: number;
  newSuppliersLastMonth: number;
  growthRate: number;
  supplierGrowthRate: number;
}

export interface UserRegistrationTrends {
  series: Array<{
    name: string;
    data: number[];
  }>;
  categories: string[];
  monthlyData: Array<{
    month: string;
    year: number;
    registrations: number;
    activations: number;
  }>;
}

export interface UserRoleDistribution {
  series: Array<{
    name: string;
    data: number[];
  }>;
  categories: string[];
  roleData: Array<{
    role: string;
    count: number;
    percentage: number;
  }>;
}

export interface UserActivityDistribution {
  series: number[];
  labels: string[];
  activityData: {
    active: number;
    inactive: number;
    blocked: number;
    emailVerified: number;
    emailUnverified: number;
  };
  percentages: {
    activePercentage: number;
    inactivePercentage: number;
    blockedPercentage: number;
    verifiedPercentage: number;
  };
}

export interface CompleteUserAnalytics {
  overview: UserAnalyticsOverview;
  registrationTrends: UserRegistrationTrends;
  roleDistribution: UserRoleDistribution;
  activityDistribution: UserActivityDistribution;
  generatedAt: Date;
}

export const analyticsService = {
  // Get complete user analytics with all data combined
  getCompleteUserAnalytics: async (): Promise<CompleteUserAnalytics> => {
    try {
      const [overview, registrationTrends, roleDistribution, activityDistribution] = await Promise.all([
        analyticsService.getUserAnalyticsOverview(),
        analyticsService.getUserRegistrationTrends(12),
        analyticsService.getUserRoleDistribution(),
        analyticsService.getUserActivityDistribution(),
      ]);

      return {
        overview,
        registrationTrends,
        roleDistribution,
        activityDistribution,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error fetching complete user analytics:", error);
      throw new Error("Failed to fetch complete user analytics");
    }
  },

  // Get user analytics overview with aggregation
  getUserAnalyticsOverview: async (): Promise<UserAnalyticsOverview> => {
    try {
      // Get current month and last month dates
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get customer, supplier, and super admin category IDs
      const customerCategory = await UserCategory.findOne({ 
        categoryType: { $regex: /^customer$/i } 
      });
      const supplierCategory = await UserCategory.findOne({ 
        categoryType: { $regex: /^supplier$/i } 
      });
      const superAdminCategory = await UserCategory.findOne({ 
        categoryType: { $regex: /^super admin$/i } 
      });

      // Aggregation pipeline for comprehensive user stats
      const statsAggregation = await User.aggregate([
        // First stage: Exclude super admin users
        {
          $match: {
            userType: { $ne: superAdminCategory?._id }
          }
        },
        {
          $facet: {
            // Total counts
            totalStats: [
              {
                $group: {
                  _id: null,
                  totalUsers: { $sum: 1 },
                  activeUsers: {
                    $sum: {
                      $cond: [{ $eq: ["$isBlocked", false] }, 1, 0]
                    }
                  },
                  blockedUsers: {
                    $sum: {
                      $cond: [{ $eq: ["$isBlocked", true] }, 1, 0]
                    }
                  },
                  emailVerifiedUsers: {
                    $sum: {
                      $cond: [{ $eq: ["$isEmailVerified", true] }, 1, 0]
                    }
                  },
                  totalCustomers: {
                    $sum: {
                      $cond: [
                        { $eq: ["$userType", customerCategory?._id] }, 
                        1, 
                        0
                      ]
                    }
                  },
                  totalSuppliers: {
                    $sum: {
                      $cond: [
                        { $eq: ["$userType", supplierCategory?._id] }, 
                        1, 
                        0
                      ]
                    }
                  }
                }
              }
            ],
            // This month's new users
            thisMonthUsers: [
              {
                $match: {
                  createdAt: { $gte: startOfThisMonth }
                }
              },
              {
                $count: "count"
              }
            ],
            // Last month's new users
            lastMonthUsers: [
              {
                $match: {
                  createdAt: { 
                    $gte: startOfLastMonth,
                    $lte: endOfLastMonth
                  }
                }
              },
              {
                $count: "count"
              }
            ],
            // This month's new suppliers
            thisMonthSuppliers: [
              {
                $match: {
                  createdAt: { $gte: startOfThisMonth },
                  userType: supplierCategory?._id
                }
              },
              {
                $count: "count"
              }
            ],
            // Last month's new suppliers
            lastMonthSuppliers: [
              {
                $match: {
                  createdAt: { 
                    $gte: startOfLastMonth,
                    $lte: endOfLastMonth
                  },
                  userType: supplierCategory?._id
                }
              },
              {
                $count: "count"
              }
            ]
          }
        }
      ]);

      const stats = statsAggregation[0];
      const totalStats = stats.totalStats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        blockedUsers: 0,
        emailVerifiedUsers: 0,
        totalCustomers: 0
      };

      const newUsersThisMonth = stats.thisMonthUsers[0]?.count || 0;
      const newUsersLastMonth = stats.lastMonthUsers[0]?.count || 0;
      const newSuppliersThisMonth = stats.thisMonthSuppliers[0]?.count || 0;
      const newSuppliersLastMonth = stats.lastMonthSuppliers[0]?.count || 0;

      // Calculate growth rates
      const growthRate = newUsersLastMonth > 0 
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 
        : newUsersThisMonth > 0 ? 100 : 0;
      
      const supplierGrowthRate = newSuppliersLastMonth > 0 
        ? ((newSuppliersThisMonth - newSuppliersLastMonth) / newSuppliersLastMonth) * 100 
        : newSuppliersThisMonth > 0 ? 100 : 0;

      return {
        totalUsers: totalStats.totalUsers,
        activeUsers: totalStats.activeUsers,
        blockedUsers: totalStats.blockedUsers,
        totalCustomers: totalStats.totalCustomers,
        totalSuppliers: totalStats.totalSuppliers,
        emailVerifiedUsers: totalStats.emailVerifiedUsers,
        newUsersThisMonth,
        newUsersLastMonth,
        newSuppliersThisMonth,
        newSuppliersLastMonth,
        growthRate: Math.round(growthRate * 100) / 100, // Round to 2 decimal places
        supplierGrowthRate: Math.round(supplierGrowthRate * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      console.error("Error fetching user analytics overview:", error);
      throw new Error("Failed to fetch user analytics overview");
    }
  },

  // Get user registration trends with monthly aggregation
  getUserRegistrationTrends: async (months: number = 12): Promise<UserRegistrationTrends> => {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Get super admin category ID to exclude
      const superAdminCategory = await UserCategory.findOne({
        categoryType: { $regex: /^super admin$/i }
      });

      // Aggregation pipeline for registration trends
      const trendsAggregation = await User.aggregate([
        // First stage: Exclude super admin users
        {
          $match: {
            userType: { $ne: superAdminCategory?._id }
          }
        },
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            registrations: { $sum: 1 },
            activations: {
              $sum: {
                $cond: [
                  { 
                    $and: [
                      { $eq: ["$isBlocked", false] },
                      { $eq: ["$isEmailVerified", true] }
                    ]
                  }, 
                  1, 
                  0
                ]
              }
            }
          }
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 }
        }
      ]);

      // Generate complete month series (fill missing months with 0)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const categories: string[] = [];
      const registrationData: number[] = [];
      const activationData: number[] = [];
      const monthlyData: Array<{ month: string; year: number; registrations: number; activations: number; }> = [];

      // Create a map for quick lookup
      const dataMap = new Map();
      trendsAggregation.forEach(item => {
        const key = `${item._id.year}-${item._id.month}`;
        dataMap.set(key, item);
      });

      // Fill in the data for each month
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthName = monthNames[month - 1];
        
        const key = `${year}-${month}`;
        const data = dataMap.get(key) || { registrations: 0, activations: 0 };
        
        categories.push(monthName);
        registrationData.push(data.registrations);
        activationData.push(data.activations);
        monthlyData.push({
          month: monthName,
          year,
          registrations: data.registrations,
          activations: data.activations
        });
      }

      return {
        series: [
          {
            name: 'New Registrations',
            data: registrationData
          },
          {
            name: 'User Activations',
            data: activationData
          }
        ],
        categories,
        monthlyData
      };
    } catch (error) {
      console.error("Error fetching user registration trends:", error);
      throw new Error("Failed to fetch user registration trends");
    }
  },

  // Get user role distribution with proper joins and aggregation
  getUserRoleDistribution: async (): Promise<UserRoleDistribution> => {
    try {
      // Only exclude super admin, include suppliers
      const excludedRoles = ["super admin"];
      
      // Get excluded user categories
      const excludedCategories = await UserCategory.find({
        categoryType: { $in: excludedRoles.map(role => new RegExp(`^${role}$`, 'i')) }
      });
      console.log("excludedCategoriesexcludedCategories : " , excludedCategories)
      const excludedCategoryIds = excludedCategories.map(cat => cat._id);

      // Aggregation pipeline for role distribution
      const roleDistributionAggregation = await User.aggregate([
        {
          $match: {
            userType: { $nin: excludedCategoryIds }
          }
        },
        {
          $lookup: {
            from: "usercategories",
            localField: "userType",
            foreignField: "_id",
            as: "userCategory"
          }
        },
        {
          $unwind: {
            path: "$userCategory",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: "$userCategory.role",
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 10 // Limit to top 10 roles
        }
      ]);

      console.log("roleDistributionAggregation : " , roleDistributionAggregation)

      // Calculate total for percentages
      const totalUsers = roleDistributionAggregation.reduce((sum, item) => sum + item.count, 0);

      // Process the data
      const roleData = roleDistributionAggregation.map(item => ({
        role: item._id || 'Unknown',
        count: item.count,
        percentage: totalUsers > 0 ? Math.round((item.count / totalUsers) * 100 * 100) / 100 : 0
      }));

      const categories = roleData.map(item => 
        item.role.charAt(0).toUpperCase() + item.role.slice(1)
      );
      const counts = roleData.map(item => item.count);

      return {
        series: [{
          name: 'Users',
          data: counts
        }],
        categories,
        roleData
      };
    } catch (error) {
      console.error("Error fetching user role distribution:", error);
      throw new Error("Failed to fetch user role distribution");
    }
  },

  // Get user activity distribution with aggregation
  getUserActivityDistribution: async (): Promise<UserActivityDistribution> => {
    try {
      // Get super admin category ID to exclude
      const superAdminCategory = await UserCategory.findOne({
        categoryType: { $regex: /^super admin$/i }
      });

      // Aggregation pipeline for activity distribution
      const activityAggregation = await User.aggregate([
        // First stage: Exclude super admin users
        {
          $match: {
            userType: { $ne: superAdminCategory?._id }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  { 
                    $and: [
                      { $eq: ["$isBlocked", false] },
                      { $eq: ["$isEmailVerified", true] }
                    ]
                  }, 
                  1, 
                  0
                ]
              }
            },
            blocked: {
              $sum: {
                $cond: [{ $eq: ["$isBlocked", true] }, 1, 0]
              }
            },
            emailVerified: {
              $sum: {
                $cond: [{ $eq: ["$isEmailVerified", true] }, 1, 0]
              }
            },
            emailUnverified: {
              $sum: {
                $cond: [{ $eq: ["$isEmailVerified", false] }, 1, 0]
              }
            }
          }
        }
      ]);

      const data = activityAggregation[0] || {
        total: 0,
        active: 0,
        blocked: 0,
        emailVerified: 0,
        emailUnverified: 0
      };

      // Calculate inactive users (not blocked but not verified)
      const inactive = data.total - data.active - data.blocked;

      // Calculate percentages
      const total = data.total;
      const activePercentage = total > 0 ? Math.round((data.active / total) * 100) : 0;
      const inactivePercentage = total > 0 ? Math.round((inactive / total) * 100) : 0;
      const blockedPercentage = total > 0 ? Math.round((data.blocked / total) * 100) : 0;
      const verifiedPercentage = total > 0 ? Math.round((data.emailVerified / total) * 100) : 0;

      return {
        series: [activePercentage, inactivePercentage, blockedPercentage],
        labels: ['Active + Verified', 'Active + Non Verified', 'Blocked'],
        activityData: {
          active: data.active,
          inactive,
          blocked: data.blocked,
          emailVerified: data.emailVerified,
          emailUnverified: data.emailUnverified
        },
        percentages: {
          activePercentage,
          inactivePercentage,
          blockedPercentage,
          verifiedPercentage
        }
      };
    } catch (error) {
      console.error("Error fetching user activity distribution:", error);
      throw new Error("Failed to fetch user activity distribution");
    }
  },
};
