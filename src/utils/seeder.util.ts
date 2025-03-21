import { ProductCategory, User, UserCategory } from "@/models";
import mongoose from "mongoose";

const seedData = async () => {
  // 1. Seed User Category (Super Admin Role)
  const userCategoryData = {
    _id: new mongoose.Types.ObjectId("679bb2dad0461eda67da8e17"), // Ensure this is unique for your use
    role: "super admin",
    description: "This category is just for super admin usage.",
    permissions: [
      "DASHBOARD",
      "MANAGE_USERS",
      "MANAGE_SUPPLIERS",
      "MANAGE_INVENTORY",
      "GAMERS_COMMUNITY",
      "MANAGE_POLICIES",
      "SETTINGS",
      "ADD_USERS_CATEGORY",
      "VIEW_USERS_CATEGORY",
      "ADD_USERS",
      "VIEW_USERS",
      "ADD_SUPPLIERS_CATEGORY",
      "VIEW_SUPPLIERS_CATEGORY",
      "ADD_SUPPLIERS",
      "VIEW_SUPPLIERS",
      "ADD_INVENTORY_CATEGORY",
      "VIEW_INVENTORY_CATEGORY",
      "ADD_INVENTORY",
      "VIEW_INVENTORY",
      "VIEW_GAMERS_COMMUNITY",
      "VIEW_BLOGS",
      "VIEW_POLICIES",
      "VIEW_PAYMENT_POLICIES",
      "VIEW_POSTAGE_POLICIES",
      "VIEW_SUBSCRIPTIONS",
      "VIEW_FAQS",
      "MANAGE_TAXES_AND_DISCOUNTS",
      "ADD_TAXES",
      "VIEW_TAXES",
      "ADD_DISCOUNTS",
      "VIEW_DISCOUNTS",
      "MANAGE_VARIATION",
      "MANAGE_DISCOUNTS",
      "VIEW_STOCK",
      "ADD_STOCK",
    ],
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let userCategory = await UserCategory.findOne({ role: userCategoryData.role });

  if (!userCategory) {
    // Create the user category (role)
    userCategory = new UserCategory(userCategoryData);
    await userCategory.save();
    console.log("Super Admin User Category created.");
  } else {
    console.log("Super Admin User Category already exists.");
  }

  // 2. Seed SuperAdmin User
  const superAdminData = {
    _id: new mongoose.Types.ObjectId("674d9bdb847b89c5b0766555"),
    firstName: "SUPER",
    lastName: "ADMIN",
    email: "superadmin@gmail.com",
    password: "$2b$10$3BgdiUfdTySwQ6AEYTJemO/kzENfDUXU6h2oDG.zEFR7HaapCA9gu", // Already hashed
    phoneNumber: "443452452344",
    dob: "2024-12-16",
    signUpThrough: "Web",
    isEmailVerified: true,
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

  let superAdmin = await User.findOne({ email: superAdminData.email });

  if (!superAdmin) {
    // Create SuperAdmin user
    superAdmin = new User(superAdminData);
    await superAdmin.save();
    console.log("SuperAdmin user created.");
  } else {
    console.log("SuperAdmin user already exists.");
  }

  // 3. Seed Product Categories
  const productCategoryData = [
    {
      name: "all in one pc",
      description:
        "This Category deals in All In One PC This Category is designed for users who want an all-in-one system.",
      image:
        "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2Fdownload%20(3).jpg?alt=media&token=74c4d1eb-b45c-46ff-985e-e900edd56e43",
      tags: ["pc", "system", "all in one"],
      isBlocked: false,
      isPart: false,
    },
    {
      name: "laptop",
      description: "Laptops for various users: gaming, business, and personal use.",
      image:
        "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2Flaptop.jpg?alt=media&token=74c4d1eb-b45c-46ff-985e-e900edd56e43",
      tags: ["laptop", "electronics", "mobile"],
      isBlocked: false,
      isPart: true,
    },
    {
      name: "gaming pc",
      description: "High-performance gaming PCs for serious gamers.",
      image:
        "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2Fgamingpc.jpg?alt=media&token=74c4d1eb-b45c-46ff-985e-e900edd56e43",
      tags: ["gaming", "pc", "high performance"],
      isBlocked: false,
      isPart: true,
    },
  ];

  for (const category of productCategoryData) {
    let productCategory = await ProductCategory.findOne({ name: category.name });

    if (!productCategory) {
      // Create the Product Category
      productCategory = new ProductCategory(category);
      await productCategory.save();
      console.log(`Product Category '${category.name}' created.`);
    } else {
      console.log(`Product Category '${category.name}' already exists.`);
    }
  }

  console.log("Seeder completed.");
};

// Export the seeder function for use in other files
export default seedData;
