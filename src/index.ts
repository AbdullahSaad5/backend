import dotenv from "dotenv";
import express, { Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { mongoose } from "./datasources";
import { authMiddleware, corsMiddleware, apiRateLimiter } from "./middlewares";
import { router } from "./routes/index.route";
import { socketManager } from "./datasources/socket.datasource";
import seedData from "./utils/seeder.util";
import { requestLogger } from "./middlewares/requestLogger.middleware";
import { initCron } from "./cron";
import { ApiDocumentation } from "./utils/api-documentation.util";
import { documentationConfig } from "./config/documentation.config";
// Configure dotenv to use .env file like .env.dev or .env.prod
dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});

const app: Express = express();

// Connect to MongoDB and seed data, then start server
console.log("🚀 Starting application initialization...");

mongoose
  .run()
  .then(() => {
    console.log("📡 MongoDB connected, starting database seeding...");
    return seedData();
  })
  .then(() => {
    console.log("✅ Database seeded successfully.");
    console.log("🌐 Starting HTTP server...");

    // Start the server only after seeding is complete
    app.options("*", corsMiddleware);

    // This route is specifically handled before the express.json() middleware to allow raw JSON requests
    // from Stripe webhook
    // Don't remove this route from here
    // I tried to move this route to the stripe.route.ts file but it didn't work
    // So, I had to keep it here
    // To make sure it keeps working, don't remove this route from here
    // app.post("/api/stripe/handle-webhook", express.raw({ type: "application/json" }), stripeController.webhookHandler);
    app.use(requestLogger); // Use the request logger middleware
    // Use morgan for logging requests
    // const accessLogStream = fs.createWriteStream(path.join(__dirname, "access.log"), { flags: "a" });
    app.use(
      apiRateLimiter, // Apply API rate limiting globally
      express.json({ limit: "10mb" }),
      express.urlencoded({ limit: "10mb", extended: true }),
      morgan("dev"),
      // morgan("combined", { stream: accessLogStream }),
      corsMiddleware,
      authMiddleware,
      helmet()
    );

    // Serve static files for profile documents
    app.use("/uploads/profile-documents", express.static(path.join(__dirname, "../uploads/profile-documents")));

    // Add the new route to show the welcome message
    app.get("/", (req, res) => {
      res.send("Welcome to Bavit Backend");
    });

    // Setup API documentation
    const apiDoc = new ApiDocumentation(app, documentationConfig);

    // Admin API routes
    app.use("/api", router);

    initCron();
    const port = process.env.PORT || 5000;
    console.log(`🔧 Attempting to start server on port: ${port}`);

    const httpServer = app.listen(port, () => {
      console.log(`🚀 Server is running on port: ${port}`);
      console.log(`🌍 Server URL: http://localhost:${port}`);
    });

    // Add socket.io to the server
    socketManager.run(httpServer);
  })
  .catch((error) => {
    console.error("❌ Error during startup:", error);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  // Don't exit the process, just log the error
});

// Graceful shutdown
["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    console.log(`Received signal: ${signal}`);
    console.log("Shutting down server");
    mongoose.stop().then(() => {
      process.exit(0);
    });
  });
});

export { app };
