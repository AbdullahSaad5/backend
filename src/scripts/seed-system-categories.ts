import mongoose from "mongoose";
import { ExpenseCategory } from "@/models/expensecategory.model";

export const seedSystemExpenseCategories = async () => {
  try {
    // console.log("🌱 Seeding system expense categories...");

    // System categories to create
    const systemCategories = [
      {
        _id: new mongoose.Types.ObjectId("688a0f06484b26aea1095f82"),
        title: "inventory purchase",
        description: "System generated category for inventory purchase expenses",
        isSystemGenerated: true,
        isBlocked: false,
      },
      {
        _id: new mongoose.Types.ObjectId("688a23bc78554b400be341cb"),
        title: "payroll",
        description: "System generated category for payroll expenses",
        isSystemGenerated: true,
        isBlocked: false,
      },
      {
        _id: new mongoose.Types.ObjectId("68a35f896286d84c0499eff2"), // Existing Recursive Expense category
        title: "recursive expense",
        description: "System generated category for recurring expenses",
        isSystemGenerated: true,
        isBlocked: false,
      },
    ];

    for (const categoryData of systemCategories) {
      const existingCategory = await ExpenseCategory.findById(categoryData._id);

      if (!existingCategory) {
        const category = new ExpenseCategory(categoryData);
        await category.save();
        console.log(`✅ Created system category: ${categoryData.title} (${categoryData._id})`);
      } else {
        // console.log(`ℹ️ System category already exists: ${categoryData.title}`);
      }
    }

    // console.log("✅ System expense categories seeded successfully");
    return true;
  } catch (error) {
    console.error("❌ Error seeding system expense categories:", error);
    throw error;
  }
};

// Run this script directly if called
if (require.main === module) {
  const runSeeder = async () => {
    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/bavit");
      console.log("🔌 Connected to MongoDB");

      await seedSystemExpenseCategories();

      console.log("🎉 Seeding completed successfully");
    } catch (error) {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    }
  };

  runSeeder();
}
