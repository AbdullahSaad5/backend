const User = require("../src/models/user.model.ts");
const mongoose = require("mongoose");

async function deleteUnverifiedUsers() {
  console.log("hello in script : ")
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const result = await User.deleteMany({
      isEmailVerified: false,
      createdAt: { $lte: thirtyDaysAgo },
    });

    console.log(`${result.deletedCount} unverified users deleted.`);
  } catch (error) {
    console.error('Error deleting unverified users:', error);
  }
}


(async () => {
    try {
      // Connect to MongoDB
      await mongoose.connect("mongodb+srv://bavituk2024:1IrE8GBsWYBgcuHi@bavit.5nteb.mongodb.net/?retryWrites=true&w=majority&appName=bavit", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
  
      console.log("Connected to MongoDB");
  
      // Run the deletion logic
      await deleteUnverifiedUsers();
  
      // Close the database connection
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
    } catch (error) {
      console.error("Error in script execution:", error);
    }
  })();

