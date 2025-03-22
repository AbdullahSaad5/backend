import mongoose from "mongoose";
import seedData from "./path/to/seedData"; // Adjust the path according to where your seedData function is located

// MongoDB connection URI
// Update this with your actual MongoDB URI

const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Exit process if connection fails
  }
};

const runSeeder = async () => {
  try {
    // Connect to the database
    await connectToDB();

    // Call the seedData function to populate the database
    await seedData();

    console.log("Seeding completed successfully.");

    // Close the connection after seeding
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1); // Exit process if seeding fails
  }
};

// Run the seeder
runSeeder();
