import { ProductCategory, User, UserCategory } from "@/models";
import mongoose from "mongoose";

// Sample seed data for UserCategory, SuperAdmin, and ProductCategories
const seedData = async () => {
  // 1. Seed User Category (Super Admin Role)
  const superAdminCategoryData = {
    _id: new mongoose.Types.ObjectId("679bb2dad0461eda67da8e17"), // Unique ID for super admin
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

  let userCategory = await UserCategory.findOne({ role: superAdminCategoryData.role });

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

  // 2. Seed Supplier User Category (New Category)
  const supplierCategoryData = {
    _id: new mongoose.Types.ObjectId("68026f5f66b4649dc9c4d401"), // Unique ID for supplier
    role: "supplier",
    description: "This is Supplier Category",
    permissions: [
      "DASHBOARD",
      "SETTINGS",
      "MANAGE_USERS",
      "ADD_USERS",
      "VIEW_USERS",
      "MANAGE_SUPPLIERS",
      "VIEW_SUPPLIERS_CATEGORY",
      "VIEW_SUPPLIERS",
      "MANAGE_INVENTORY",
      "VIEW_INVENTORY",
      "VIEW_INVENTORY_CATEGORY",
      "MANAGE_TAXES_AND_DISCOUNTS",
      "ADD_TAXES",
      "VIEW_TAXES",
      "ADD_DISCOUNTS",
      "VIEW_DISCOUNTS",
    ],
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let supplierCategory = await UserCategory.findOne({ role: supplierCategoryData.role });

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

  // 3. Seed SuperAdmin User
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
    // Create SuperAdmin user if it doesn't exist
    superAdmin = new User(superAdminData);
    await superAdmin.save();
    console.log("SuperAdmin user created.");
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

  // 4. Seed Product Categories
  // const productCategoryData = [
  //   {
  //     _id: "675ae44f9dfbe212be595dcc",
  //     name: "all in one pc",
  //     description:
  //       "This Category deals in All In One PC. This Category will auto seeded in the system even if usuer accidently delete it from the database.",
  //     image:
  //       "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2Fdownload%20(3).jpg?alt=media&token=74c4d1eb-b45c-46ff-985e-e900edd56e43",
  //     tags: ["pc", "system ", "all in one"],
  //     isBlocked: false,
  //   },
  //   {
  //     _id: "6808c108de660f64292ad7ed",
  //     name: "mini pc",
  //     description:
  //       "This Category deals in Mini PCs. This Category will auto seeded in the system even if user accidently delete it from the database.",
  //     image:
  //       "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2FComputer%20PC%20Personal%20Computer%20Build.jpg?alt=media&token=85d5d4b7-3609-4e81-a742-e3ae4fd2db30",
  //     tags: ["mini pc", "system ", "pc"],
  //     isBlocked: false,
  //   },
  //   {
  //     _id: "6776f21067212ef8bc84ca77",
  //     name: "laptops",
  //     description:
  //       "This category relates to laptops. This laptop combines performance and portability, featuring a powerful processor and ample storage for seamless multitasking. Its sleek design and lightweight build make it easy to carry, while the high-resolution display ",
  //     image:
  //       "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2F712gCL7ikLL._AC_UF894%2C1000_QL80_.jpg?alt=media&token=dabf9e58-e695-4a0b-b800-ed6449ea120f",
  //     tags: ["laptops", "pc", "electronics", "laptops12"],
  //     isBlocked: false,
  //   },
  //   {
  //     _id: "6776f2a167212ef8bc84ca80",
  //     name: "projectors",
  //     description:
  //       "This category delas in projectors are very cute and pretty nice seems goodddddddddddddddddddddddddddd",
  //     image:
  //       "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2F4f4ac4f635a2c38f2ea52df054533afe01d96809_2_626x500.jpeg?alt=media&token=bfe90b80-54ff-4494-9c88-9debb38d8ed7",
  //     tags: ["projectors", "screens", "electronics"],
  //     isBlocked: false,
  //   },
  //   {
  //     _id: "677becb7562d361aa73817cb",
  //     name: "monitors",
  //     description:
  //       "This Category relates with Monitors asdasd asdasdasd asdasdasdsa dasdasdasdasd asdasdasd asdasdad asdadsasd123",
  //     image:
  //       "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2Fdownload%20(7).jpg?alt=media&token=6d700cc9-2267-4940-83fe-c3b847275986",
  //     tags: ["monitors", "pcs", "screens"],
  //     isBlocked: false,
  //   },
  //   {
  //     _id: "677bed9c562d361aa73817cf",
  //     name: "gaming pc",
  //     description:
  //       "This Catgeory  relates to Gaming PC  tttttttttttttttttttttttttttttttttttttttttttttttttttt hhhhhhhhhhhhhhhhhhhhhhhhh",
  //     image:
  //       "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2Fdownload%20(8).jpg?alt=media&token=76f92f00-0231-4364-a658-b66ab98e9384",
  //     tags: ["games", "gaminng", "pcs"],
  //     isBlocked: false,
  //   },
  //   {
  //     _id: "677bedf5562d361aa73817d2",
  //     name: "network equipments",
  //     description:
  //       "this not a product this not a product this not a product this not a product this not a product this not a product ",
  //     image:
  //       "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2Fdownload%20(9).jpg?alt=media&token=e90a6162-09e0-48ad-82f7-93ba31fbda01",
  //     tags: ["bike", "computer"],
  //     isBlocked: false,
  //   },
  //   // {
  //   //   _id: "67da34cd1460c643b327a16e",
  //   //   name: "part Category",
  //   //   description:
  //   //     "asdasdasd sdf  asdasdasd sdf  asdasdasd sdf  asdasdasd sdf  asdasdasd sdf  asdasdasd sdf  asdasdasd sdf  asdasdasd sdf  asdasdasd sdf  asdasdasd sdf  ",
  //   //   image:
  //   //     "https://firebasestorage.googleapis.com/v0/b/axiom-528ab.appspot.com/o/uploads%2Fgaming-desktop-pc.jpg?alt=media&token=92e51bec-8f13-4009-8587-5d816ba53034",
  //   //   tags: ["asd"],
  //   //   isPart: true,
  //   //   isBlocked: false,
  //   // },
  // ];

  // for (const category of productCategoryData) {
  //   let productCategory: any = await ProductCategory.findOne({ _id: category._id });

  //   if (!productCategory) {
  //     // Create new product category if it doesn't exist
  //     productCategory = new ProductCategory(category);
  //     await productCategory.save();
  //     console.log(`Product Category '${category.name}' created.`);
  //   } else {
  //     // Compare and update the product category if needed
  //     if (
  //       productCategory.description !== category.description ||
  //       productCategory.isBlocked !== category.isBlocked ||
  //       // productCategory.isPart !== category.isPart ||
  //       !productCategory.tags.every((tag: any, index: any) => tag === category.tags[index])
  //     ) {
  //       productCategory.set(category);
  //       await productCategory.save();
  //       console.log(`Product Category '${category.name}' updated.`);
  //     } else {
  //       console.log(`Product Category '${category.name}' already exists and matches.`);
  //     }
  //   }
  // }

  console.log("Seeder completed.");
};

// Export the seeder function for use in other files
export default seedData;
