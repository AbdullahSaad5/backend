import { User, UserCategory } from "@/models";
import mongoose from "mongoose";
import { createHash } from "./hash.util";
import dotenv from "dotenv";
import { IntegrationTokenModel } from "@/models/integration-token.model";
dotenv.config();
// Sample seed data for UserCategory, SuperAdmin, and ProductCategories
const seedData = async () => {
  // 0. Seed Integration Tokens (optional via environment variables)
  await seedIntegrationTokens();
  // 1. Seed User Category (Super Admin Role)
  const superAdminCategoryData = {
    _id: new mongoose.Types.ObjectId("679bb2dad0461eda67da8e17"), // Unique ID for super admin
    role: "super admin",
    description: "This category is just for super admin usage.",
    permissions: [
      "DASHBOARD",

      "MANAGE_USERS",
      "ADD_USERS_CATEGORY",
      "VIEW_USERS_CATEGORY",
      "ADD_TEAMS",
      "VIEW_TEAMS",
      "ADD_USERS",
      "VIEW_USERS",

      "MANAGE_SUPPLIERS",
      "ADD_SUPPLIERS_CATEGORY",
      "VIEW_SUPPLIERS_CATEGORY",
      "ADD_SUPPLIERS",
      "VIEW_SUPPLIERS",

      "MANAGE_INVENTORY",
      "ADD_INVENTORY_CATEGORY",
      "VIEW_INVENTORY_CATEGORY",
      "ADD_INVENTORY",
      "VIEW_INVENTORY",
      "ADD_STOCK",
      "VIEW_STOCK",
      "VIEW_LISTING",
      "ADD_LISTING",
      "MANAGE_DISCOUNTS",

      "ORDER_PIPELINE",

      "MANAGE_BUNDLES",
      "ADD_BUNDLES",
      "VIEW_BUNDLES",

      "GAMERS_COMMUNITY",
      "VIEW_BLOGS_CATEGORY",
      "ADD_BLOGS_CATEGORY",
      "VIEW_BLOGS",
      "ADD_BLOGS",
      "VIEW_GAMERS_COMMUNITY",
      "ADD_GAMERS_COMMUNITY",

      "HR_MANAGEMENET",
      "VIEW_EMPLOYEES",
      "ADD_EMPLOYEES",
      "VIEW_WORK_SHIFT",
      "ADD_WORK_SHIFT",
      "VIEW_ATTENDANCE",

      "MANAGE_TICKETING",
      "ADD_TICKET",
      "VIEW_TICKET",
      "MANAGE_DOCUMENTS",

      "MANAGE_POLICIES",
      "VIEW_CUSTOM_POLICIES",
      "ADD_CUSTOM_POLICIES",
      "VIEW_PAYMENT_POLICIES",
      "ADD_PAYMENT_POLICIES",
      "VIEW_FULFILLMENT_POLICIES",
      "ADD_FULFILLMENT_POLICIES",
      "VIEW_RETURN_POLICIES",
      "ADD_RETURN_POLICIES",
      "ADD_SUBSCRIPTIONS",
      "VIEW_SUBSCRIPTIONS",
      "ADD_FAQ_CATEGORY",
      "VIEW_FAQ_CATEGORY",
      "ADD_FAQS",
      "VIEW_FAQS",

      "COMPLAINTS_MANAGEMENET",
      "VIEW_COMPLAINTS_CATEGORY",
      "ADD_COMPLAINTS_CATEGORY",
      "VIEW_COMPLAINTS",
      "ADD_COMPLAINTS",

      "LEADS_MANAGEMENT",
      "ADD_LEADS_CATEGORIES",
      "VIEW_LEADS_CATEGORIES",
      "ADD_LEADS",
      "VIEW_LEADS",

      "MANAGE_ACCOUNTING",
      "ADD_EXPENSE_CATEGORY",
      "VIEW_EXPENSE_CATEGORY",
      "ADD_EXPENSE",
      "VIEW_EXPENSE",
      "VIEW_REVENUE",
      "ADD_REVENUE",
      "VIEW_INVENTORY_PURCHASES",

      "MANAGE_GUIDES",
      "VIEW_GUIDES_CATEGORY",
      "ADD_GUIDE_CATEGORY",
      "VIEW_GUIDES",
      "ADD_GUIDES",

      "SETTINGS",
      "MANAGE_CONTENT",
    ],
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const adminCategoryData = {
    _id: new mongoose.Types.ObjectId("6749acd1ee2cd751095fb5ee"), // Unique ID for super admin
    role: "admin",
    description: "Admin has Access to Everything",
    permissions: [
      "DASHBOARD",

      "MANAGE_USERS",
      // "ADD_USERS_CATEGORY",
      // "VIEW_USERS_CATEGORY",
      "ADD_TEAMS",
      "VIEW_TEAMS",
      "ADD_USERS",
      "VIEW_USERS",

      "MANAGE_SUPPLIERS",
      "ADD_SUPPLIERS_CATEGORY",
      "VIEW_SUPPLIERS_CATEGORY",
      "ADD_SUPPLIERS",
      "VIEW_SUPPLIERS",

      "MANAGE_INVENTORY",
      // "ADD_INVENTORY_CATEGORY",
      // "VIEW_INVENTORY_CATEGORY",
      "ADD_INVENTORY",
      "VIEW_INVENTORY",
      "ADD_STOCK",
      "VIEW_STOCK",
      "VIEW_LISTING",
      "ADD_LISTING",
      "MANAGE_DISCOUNTS",

      "COMPLAINTS_MANAGEMENET",
      "VIEW_COMPLAINTS_CATEGORY",
      "ADD_COMPLAINTS_CATEGORY",
      "VIEW_COMPLAINTS",
      "ADD_COMPLAINTS",

      // "LEADS_MANAGEMENT",
      // "ADD_LEADS_CATEGORIES",
      // "VIEW_LEADS_CATEGORIES",
      // "ADD_LEADS",
      // "VIEW_LEADS",

      "MANAGE_BUNDLES",
      "ADD_BUNDLES",
      "VIEW_BUNDLES",

      // "GAMERS_COMMUNITY",
      // "VIEW_BLOGS_CATEGORY",
      // "ADD_BLOGS_CATEGORY",
      // "VIEW_BLOGS",
      // "ADD_BLOGS",
      // "VIEW_GAMERS_COMMUNITY",
      // "ADD_GAMERS_COMMUNITY",

      "HR_MANAGEMENET",
      "VIEW_EMPLOYEES",
      "ADD_EMPLOYEES",
      "VIEW_WORK_SHIFT",
      "ADD_WORK_SHIFT",
      "VIEW_ATTENDANCE",

      "MANAGE_TICKETING",
      "ADD_TICKET",
      "VIEW_TICKET",

      "MANAGE_DOCUMENTS",

      // "MANAGE_POLICIES",
      // "VIEW_CUSTOM_POLICIES",
      // "ADD_CUSTOM_POLICIES",
      // "VIEW_PAYMENT_POLICIES",
      // "ADD_PAYMENT_POLICIES",
      // "VIEW_FULFILLMENT_POLICIES",
      // "ADD_FULFILLMENT_POLICIES",
      // "VIEW_RETURN_POLICIES",
      // "ADD_RETURN_POLICIES",

      "SETTINGS",
    ],
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let userCategory = await UserCategory.findOne({
    role: superAdminCategoryData.role,
  });

  let adminUserCategory = await UserCategory.findOne({
    role: adminCategoryData.role,
  });

  if (!userCategory) {
    // If not found, create the user category (role)
    userCategory = new UserCategory(superAdminCategoryData);
    await userCategory.save();
    console.log("Super Admin User Category created.");
  } else {
    // If found, check for changes, if any, overwrite the data
    if (
      userCategory.description !== superAdminCategoryData.description ||
      !userCategory.permissions.every((permission, index) => permission === superAdminCategoryData.permissions[index])
    ) {
      userCategory.set(superAdminCategoryData);
      await userCategory.save();
      console.log("Super Admin User Category updated.");
    } else {
      console.log("Super Admin User Category already exists and matches.");
    }
  }
  if (!adminUserCategory) {
    adminUserCategory = new UserCategory(adminCategoryData);
    await adminUserCategory.save();
    console.log("Admin User Category created.");
  } else {
    // If found, check for changes, if any, overwrite the data
    if (
      adminUserCategory.description !== adminCategoryData.description ||
      !adminUserCategory.permissions.every((permission, index) => permission === adminCategoryData.permissions[index])
    ) {
      adminUserCategory.set(adminCategoryData);
      await adminUserCategory.save();
      console.log("Admin User Category updated.");
    } else {
      console.log("Admin User Category already exists and matches.");
    }
  }

  // 2. Seed Supplier User Category (New Category)
  const supplierCategoryData = {
    _id: new mongoose.Types.ObjectId("68026f5f66b4649dc9c4d401"), // Unique ID for supplier
    role: "supplier",
    description: "This is Supplier Category",
    permissions: [
      "DASHBOARD",

      "MANAGE_USERS",
      // "ADD_USERS_CATEGORY",
      // "VIEW_USERS_CATEGORY",
      // "ADD_USERS",
      "VIEW_USERS",

      "MANAGE_SUPPLIERS",
      // "ADD_SUPPLIERS_CATEGORY",
      "VIEW_SUPPLIERS_CATEGORY",
      // "ADD_SUPPLIERS",
      "VIEW_SUPPLIERS",

      "MANAGE_INVENTORY",
      // "ADD_INVENTORY_CATEGORY",
      // "VIEW_INVENTORY_CATEGORY",
      // "ADD_INVENTORY",
      "VIEW_INVENTORY",
      // "ADD_STOCK",
      // "VIEW_STOCK",
      // "VIEW_LISTING",
      // "ADD_LISTING",
      // "MANAGE_DISCOUNTS",

      "MANAGE_BUNDLES",
      // "ADD_BUNDLES",
      "VIEW_BUNDLES",

      // "GAMERS_COMMUNITY",
      // "VIEW_BLOGS_CATEGORY",
      // "ADD_BLOGS_CATEGORY",
      // "VIEW_BLOGS",
      // "ADD_BLOGS",
      // "VIEW_GAMERS_COMMUNITY",
      // "ADD_GAMERS_COMMUNITY",

      // "HR_MANAGEMENET",
      // "VIEW_EMPLOYEES",
      // "ADD_EMPLOYEES",
      // "VIEW_WORK_SHIFT",
      // "ADD_WORK_SHIFT",
      // "VIEW_ATTENDANCE",

      // "MANAGE_TICKETING",

      // "MANAGE_DOCUMENTS",

      // "MANAGE_POLICIES",
      // "VIEW_CUSTOM_POLICIES",
      // "ADD_CUSTOM_POLICIES",
      // "VIEW_PAYMENT_POLICIES",
      // "ADD_PAYMENT_POLICIES",
      // "VIEW_FULFILLMENT_POLICIES",
      // "ADD_FULFILLMENT_POLICIES",
      // "VIEW_RETURN_POLICIES",
      // "ADD_RETURN_POLICIES",

      "SETTINGS",
    ],
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let supplierCategory = await UserCategory.findOne({
    role: supplierCategoryData.role,
  });

  if (!supplierCategory) {
    // If not found, create the user category (role)
    supplierCategory = new UserCategory(supplierCategoryData);
    await supplierCategory.save();
    console.log("Supplier User Category created.");
  } else {
    // If found, check for changes, if any, overwrite the data
    if (
      supplierCategory.description !== supplierCategoryData.description ||
      !supplierCategory.permissions.every((permission, index) => permission === supplierCategoryData.permissions[index])
    ) {
      supplierCategory.set(supplierCategoryData);
      await supplierCategory.save();
      console.log("Supplier User Category updated.");
    } else {
      console.log("Supplier User Category already exists and matches.");
    }
  }
  const actualPassword: any = process.env.SYS_PASS; // Hardcoded password for seeding
  // Hash the password using createHash
  const hashedPassword = await createHash(actualPassword);
  // 3. Seed SuperAdmin User
  const superAdminData = {
    _id: new mongoose.Types.ObjectId("674d9bdb847b89c5b0766555"),
    firstName: "SUPER",
    lastName: "ADMIN",
    email: "superadmin@gmail.com",
    password: hashedPassword, // Already hashed
    phoneNumber: "443452452344",
    dob: "2024-12-16",
    signUpThrough: "Web",
    isEmailVerified: true,
    employeeId: "BMR-SADM12",
    userType: userCategory._id, // Associate with the user category (Super Admin Role)
    additionalAccessRights: [],
    restrictedAccessRights: [],
    isBlocked: false,
    documents: [],
    profileImage:
      "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2FPatient%20copy.jpg?alt=media&token=dc44e792-4c79-4e89-8572-b118ff9bb5b8",
    additionalDocuments: [],
    resetPasswordExpires: 1741744977042,
    resetPasswordToken: "0293e6db588243c00bd765ffc71e396300a248d7c1b46aec2f911338999d5720",
  };

  // 3. Seed admin User
  const adminData = {
    _id: new mongoose.Types.ObjectId("675715ba31ef09b1e5edde03"),
    firstName: "Hammad",
    lastName: "ADMIN",
    email: "admin@gmail.com",
    password: hashedPassword, // Dynamically hashed password
    phoneNumber: "443452452344",
    employeeId: "BMR-AD4G2K",
    dob: "2024-12-16",
    signUpThrough: "Web",
    isEmailVerified: true,
    userType: adminUserCategory._id, // Associate with the user category (Admin Role)
    additionalAccessRights: [],
    restrictedAccessRights: [],
    isBlocked: false,
    documents: [],
    profileImage:
      "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2FPatient%20copy.jpg?alt=media&token=dc44e792-4c79-4e89-8572-b118ff9bb5b8",
    additionalDocuments: [],
    resetPasswordExpires: 1741744977042,
    resetPasswordToken: "0293e6db588243c00bd765ffc71e396300a248d7c1b46aec2f911338999d5720",
  };
  let superAdmin = await User.findOne({ email: superAdminData.email });

  if (!superAdmin) {
    superAdmin = new User(superAdminData);
    await superAdmin.save();
    console.log("Super Admin user created.");
  } else {
    // Compare existing data and update if needed
    if (
      superAdmin.firstName !== superAdminData.firstName ||
      superAdmin.lastName !== superAdminData.lastName ||
      superAdmin.phoneNumber !== superAdminData.phoneNumber ||
      superAdmin.dob !== superAdminData.dob
    ) {
      superAdmin.set(superAdminData);
      await superAdmin.save();
      console.log("SuperAdmin user updated.");
    } else {
      console.log("SuperAdmin user already exists and matches.");
    }
  }

  let admin = await User.findOne({ email: adminData.email });

  if (!admin) {
    admin = new User(adminData);
    await admin.save();
    console.log("admin user created.");
  } else {
    // Compare existing data and update if needed
    if (
      admin.firstName !== adminData.firstName ||
      admin.lastName !== adminData.lastName ||
      admin.phoneNumber !== adminData.phoneNumber ||
      admin.dob !== adminData.dob
    ) {
      admin.set(adminData);
      await admin.save();
      console.log("admin user updated.");
    } else {
      console.log("admin user already exists and matches.");
    }
  }

  console.log("Seeder completed.");
};

// Export the seeder function for use in other files
export default seedData;

async function seedIntegrationTokens() {
  const asBoolean = (v?: string, dflt?: boolean) => (v === "true" ? true : v === "false" ? false : dflt);
  const nowMs = Date.now();

  const candidates: Array<{
    provider: "ebay" | "amazon";
    environment: "PRODUCTION" | "SANDBOX";
    useClient: boolean | undefined;
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
    generated_at?: number;
  }> = [
    // eBay PRODUCTION
    {
      provider: "ebay",
      environment: "PRODUCTION",
      useClient: asBoolean(process.env.EBAY_USE_CLIENT, true),
      access_token: process.env.EBAY_ACCESS_TOKEN,
      refresh_token: process.env.EBAY_REFRESH_TOKEN,
      token_type: "User Access Token",
      expires_in: 7200,
      refresh_token_expires_in: 47304000,
      generated_at: nowMs,
    },
    // eBay SANDBOX
    {
      provider: "ebay",
      environment: "SANDBOX",
      useClient: asBoolean(process.env.EBAY_SANDBOX_USE_CLIENT, false),
      access_token: process.env.EBAY_SANDBOX_ACCESS_TOKEN,
      refresh_token: process.env.EBAY_SANDBOX_REFRESH_TOKEN,
      token_type: "User Access Token",
      expires_in: 7200,
      refresh_token_expires_in: 47304000,
      generated_at: nowMs,
    },
    // Amazon PRODUCTION
    {
      provider: "amazon",
      environment: "PRODUCTION",
      useClient: asBoolean(process.env.AMAZON_PROD_USE_CLIENT, true),
      access_token: process.env.AMAZON_PROD_ACCESS_TOKEN,
      refresh_token: process.env.AMAZON_PROD_REFRESH_TOKEN,
      token_type: "bearer",
      expires_in: 3600,
      generated_at: nowMs,
    },
    // Amazon SANDBOX
    {
      provider: "amazon",
      environment: "SANDBOX",
      useClient: asBoolean(process.env.AMAZON_SANDBOX_USE_CLIENT, false),
      access_token: process.env.AMAZON_SANDBOX_ACCESS_TOKEN,
      refresh_token: process.env.AMAZON_SANDBOX_REFRESH_TOKEN,
      token_type: "bearer",
      expires_in: 3600,
      generated_at: nowMs,
    },
  ];

  for (const c of candidates) {
    // Only seed entries that have core fields present
    if (!c.access_token || !c.expires_in || !c.generated_at) continue;

    await IntegrationTokenModel.updateOne(
      { provider: c.provider, environment: c.environment, useClient: c.useClient },
      {
        $set: {
          access_token: c.access_token,
          refresh_token: c.refresh_token,
          token_type: c.token_type,
          expires_in: c.expires_in,
          refresh_token_expires_in: c.refresh_token_expires_in,
          generated_at: c.generated_at,
        },
      },
      { upsert: true }
    );
  }

  console.log("Integration tokens seeding complete (env-driven, if provided).");
}
