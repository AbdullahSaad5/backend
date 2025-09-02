import { User, UserCategory } from "@/models";
import mongoose from "mongoose";
import { createHash } from "./hash.util";
import dotenv from "dotenv";
import { IntegrationTokenModel } from "@/models/integration-token.model";
import { TokenInitializationService } from "@/services/token-initialization.service";
import { seedSystemExpenseCategories } from "@/scripts/seed-system-categories";
dotenv.config();

// Utility function to deeply compare objects (excluding _id, createdAt, updatedAt)
const deepCompareObjects = (
  obj1: any,
  obj2: any,
  excludeFields: string[] = ["_id", "createdAt", "updatedAt", "password", "resetPasswordExpires", "resetPasswordToken"]
): boolean => {
  if (obj1 === obj2) return true;

  if (obj1 == null || obj2 == null) return obj1 === obj2;

  if (typeof obj1 !== "object" || typeof obj2 !== "object") return obj1 === obj2;

  const keys1 = Object.keys(obj1).filter((key) => !excludeFields.includes(key));
  const keys2 = Object.keys(obj2).filter((key) => !excludeFields.includes(key));

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;

    if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
      if (obj1[key].length !== obj2[key].length) return false;
      for (let i = 0; i < obj1[key].length; i++) {
        if (!deepCompareObjects(obj1[key][i], obj2[key][i], excludeFields)) return false;
      }
    } else if (typeof obj1[key] === "object" && typeof obj2[key] === "object") {
      if (!deepCompareObjects(obj1[key], obj2[key], excludeFields)) return false;
    } else if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
};

// Sample seed data for UserCategory, SuperAdmin, and ProductCategories
const seedData = async () => {
  // ❌ DISABLED: This was deleting all tokens on every server restart!
  // await cleanupTokenCollections();

  // Initialize tokens using the new service if environment variables are available
  try {
    // console.log("🔧 Attempting to initialize tokens from credentials...");
    const envValidation = TokenInitializationService.validateEnvironmentVariables();

    if (envValidation.valid) {
      await TokenInitializationService.initializeAllTokens();
      // console.log("✅ Tokens initialized from credentials");
    } else {
      console.log("⚠️ Some environment variables missing, falling back to seeder...");
      await seedIntegrationTokens();
    }
  } catch (error) {
    console.log("⚠️ Token initialization failed, falling back to seeder...");
    await seedIntegrationTokens();
  }

  // 1. Seed User Category (Super Admin Role)
  const superAdminCategoryData = {
    _id: new mongoose.Types.ObjectId("679bb2dad0461eda67da8e17"),
    role: "dev admin",
    description: "This category is just for dev admin usage.",
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

      "MANAGE_BUNDLES",
      "ADD_BUNDLES",
      "VIEW_BUNDLES",

      "ORDER_PIPELINE_MANAGEMENT",
      "ORDER_MANAGEMENT",

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
      "VIEW_RECURRING_EXPENSE",
      "ADD_RECURRING_EXPENSE",
      "ADD_EXPENSE",
      "VIEW_EXPENSE",
      "VIEW_REVENUE",
      "ADD_REVENUE",
      "VIEW_REPORT",

      "MANAGE_GUIDES",
      "VIEW_GUIDES_CATEGORY",
      "ADD_GUIDE_CATEGORY",
      "VIEW_GUIDES",
      "ADD_GUIDES",

      "SETTINGS",
      "MANAGE_CONTENT",
    ],
    categoryType: "super admin",
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const adminCategoryData = {
    _id: new mongoose.Types.ObjectId("6749acd1ee2cd751095fb5ee"),
    role: "admin",
    description: "Admin has Access to Everything",
    categoryType: "admin",
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

      "VIEW_BLOGS_CATEGORY",
      "ADD_BLOGS_CATEGORY",
      "VIEW_BLOGS",
      "ADD_BLOGS",
      "VIEW_GAMERS_COMMUNITY",
      "ADD_GAMERS_COMMUNITY",
      "COMPLAINTS_MANAGEMENET",
      "VIEW_COMPLAINTS_CATEGORY",
      "ADD_COMPLAINTS_CATEGORY",
      "VIEW_COMPLAINTS",
      "ADD_COMPLAINTS",
      "MANAGE_GUIDES",
      "VIEW_GUIDES_CATEGORY",
      "ADD_GUIDE_CATEGORY",
      "VIEW_GUIDES",
      "ADD_GUIDES",
      "LEADS_MANAGEMENT",
      "ADD_LEADS_CATEGORIES",
      "VIEW_LEADS_CATEGORIES",
      "ADD_LEADS",
      // "VIEW_LEADS",

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

      "MANAGE_ACCOUNTING",
      "ADD_EXPENSE_CATEGORY",
      "VIEW_EXPENSE_CATEGORY",
      "VIEW_RECURRING_EXPENSE",
      "ADD_RECURRING_EXPENSE",
      "ADD_EXPENSE",
      "VIEW_EXPENSE",
      "VIEW_REVENUE",
      "ADD_REVENUE",
      "VIEW_REPORT",

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
    console.log("Dev Admin User Category created.");
  } else {
    // If found, check for changes, if any, overwrite the data
    if (!deepCompareObjects(userCategory, superAdminCategoryData)) {
      console.log("Dev Admin User Category differs from seeder data, updating...");
      // Use $set to update only specific fields without replacing the entire document
      const { _id, ...updateData } = superAdminCategoryData;
      await UserCategory.findByIdAndUpdate(userCategory._id, { $set: updateData }, { new: true });
      console.log("Dev Admin User Category updated.");
    } else {
      console.log("Dev Admin User Category already exists and matches seeder data exactly.");
    }
  }
  if (!adminUserCategory) {
    adminUserCategory = new UserCategory(adminCategoryData);
    await adminUserCategory.save();
    console.log("Admin User Category created.");
  } else {
    // If found, check for changes, if any, overwrite the data
    if (!deepCompareObjects(adminUserCategory, adminCategoryData)) {
      console.log("Admin User Category differs from seeder data, updating...");
      // Use $set to update only specific fields without replacing the entire document
      const { _id, ...updateData } = adminCategoryData;
      await UserCategory.findByIdAndUpdate(adminUserCategory._id, { $set: updateData }, { new: true });
      console.log("Admin User Category updated.");
    } else {
      console.log("Admin User Category already exists and matches seeder data exactly.");
    }
  }

  // 2. Seed Supplier User Category (New Category)
  const supplierCategoryData = {
    _id: new mongoose.Types.ObjectId("68026f5f66b4649dc9c4d401"),
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
    categoryType: "supplier",
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
    if (!deepCompareObjects(supplierCategory, supplierCategoryData)) {
      console.log("Supplier User Category differs from seeder data, updating...");
      // Use $set to update only specific fields without replacing the entire document
      const { _id, ...updateData } = supplierCategoryData;
      await UserCategory.findByIdAndUpdate(supplierCategory._id, { $set: updateData }, { new: true });
      console.log("Supplier User Category updated.");
    } else {
      console.log("Supplier User Category already exists and matches seeder data exactly.");
    }
  }
  const actualPassword: any = process.env.SYS_PASS; // Hardcoded password for seeding
  // Hash the password using createHash
  const hashedPassword = await createHash(actualPassword);
  // 3. Seed SuperAdmin User
  const superAdminData = {
    _id: new mongoose.Types.ObjectId("674d9bdb847b89c5b0766555"),
    firstName: "DEV",
    lastName: "ADMIN",
    email: "devadmin@gmail.com",
    password: hashedPassword, // Already hashed`
    phoneNumber: "443452452344",
    dob: "2024-12-16",
    signUpThrough: "Web",
    isEmailVerified: true,
    employeeId: "BMR-SADM12",
    userType: userCategory._id, // Associate with the user category (Dev Admin Role)
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
    console.log("Dev Admin user created.");
  } else {
    // Compare existing data and update if needed
    if (!deepCompareObjects(superAdmin, superAdminData)) {
      console.log("Dev Admin user differs from seeder data, updating...");
      // Use $set to update only specific fields without replacing the entire document
      const { _id, ...updateData } = superAdminData;
      await User.findByIdAndUpdate(superAdmin._id, { $set: updateData }, { new: true });
      console.log("Dev Admin user updated.");
    } else {
      console.log("Dev Admin user already exists and matches seeder data exactly.");
    }
  }

  let admin = await User.findOne({ email: adminData.email });

  if (!admin) {
    admin = new User(adminData);
    await admin.save();
    console.log("Admin user created.");
  } else {
    // Compare existing data and update if needed
    if (!deepCompareObjects(admin, adminData)) {
      console.log("Admin user differs from seeder data, updating...");
      // Use $set to update only specific fields without replacing the entire document
      const { _id, ...updateData } = adminData;
      await User.findByIdAndUpdate(admin._id, { $set: updateData }, { new: true });
      console.log("Admin user updated.");
    } else {
      console.log("Admin user already exists and matches seeder data exactly.");
    }
  }

  // Seed system expense categories
  await seedSystemExpenseCategories();

  console.log("✅ Database seeding completed successfully!");
  console.log("📊 Seeding Summary:");
  console.log("   - User Categories: Dev Admin, Admin, Supplier");
  console.log("   - Users: Dev Admin, Admin");
  console.log("   - System Categories: Expense Categories");
  console.log("   - Integration Tokens: Environment-driven");
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
    // eBay PRODUCTION - Application Token Only
    {
      provider: "ebay",
      environment: "PRODUCTION",
      useClient: false, // Always use application tokens for taxonomy APIs
      access_token: process.env.EBAY_ACCESS_TOKEN,
      refresh_token: process.env.EBAY_REFRESH_TOKEN,
      token_type: "Application Access Token",
      expires_in: 7200,
      refresh_token_expires_in: 47304000,
      generated_at: nowMs,
    },
    // eBay SANDBOX - Application Token Only
    {
      provider: "ebay",
      environment: "SANDBOX",
      useClient: false, // Always use application tokens for taxonomy APIs
      access_token: process.env.EBAY_SANDBOX_ACCESS_TOKEN,
      refresh_token: process.env.EBAY_SANDBOX_REFRESH_TOKEN,
      token_type: "Application Access Token",
      expires_in: 7200,
      refresh_token_expires_in: 47304000,
      generated_at: nowMs,
    },
    // Amazon PRODUCTION - Application Token Only
    {
      provider: "amazon",
      environment: "PRODUCTION",
      useClient: false, // Always use application tokens
      access_token: process.env.AMAZON_PROD_ACCESS_TOKEN,
      refresh_token: process.env.AMAZON_PROD_REFRESH_TOKEN,
      token_type: "bearer",
      expires_in: 3600,
      generated_at: nowMs,
    },
    // Amazon SANDBOX - Application Token Only
    {
      provider: "amazon",
      environment: "SANDBOX",
      useClient: false, // Always use application tokens
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
