import { connect, connection } from "mongoose";

export const mongoose = {
  run: async () => {
    try {
      if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not defined");
        process.exit(1);
      }

      console.log("MongoDB connection state:", connection.readyState);
      console.log("MongoDB URI:", process.env.MONGO_URI.substring(0, 20) + "...");

      // Check if already connected
      if (connection.readyState === 1) {
        console.log("Already connected to MongoDB");
        return;
      }

      await connect(process.env.MONGO_URI);
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      process.exit(1);
    }
  },

  stop: async () => {
    try {
      await connection.destroy();
      console.log("Disconnected from MongoDB");
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
};
