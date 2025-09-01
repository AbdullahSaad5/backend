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
import { outlookWebhook } from "./routes/outlook-webhook.route";
import { gmailWebhook } from "./routes/gmail-webhook.route";

// Configure dotenv to use .env file like .env.dev or .env.prod
dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});

const app: Express = express();

// Connect to MongoDB and seed data, then start server
mongoose
  .run()
  .then(() => {
    console.log("📡 MongoDB connected, starting database seeding...");
    return seedData();
  })
  .then(() => {
    console.log("✅ Database seeded successfully.");

    // Start the server only after seeding is complete
    app.options("*", corsMiddleware);

    app.use(requestLogger); // Use the request logger middleware

    // IMPORTANT: Stripe webhook route MUST be before express.json() middleware
    // to preserve raw body for signature verification
    app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

    app.use(
      apiRateLimiter, // Apply API rate limiting globally
      express.json({ limit: "10mb" }),
      express.urlencoded({ limit: "10mb", extended: true }),
      morgan("dev"),
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

    // Add webhook routes BEFORE authentication middleware
    // These routes need to be accessible without authentication for external services
    const outlookWebhookRouter = express.Router();
    outlookWebhook(outlookWebhookRouter);
    app.use("/api/outlook-webhook", outlookWebhookRouter);

    const gmailWebhookRouter = express.Router();
    gmailWebhook(gmailWebhookRouter);
    app.use("/api/gmail-webhook", gmailWebhookRouter);

    // Admin API routes (with authentication)
    app.use("/api", router);

    initCron();
    const port = process.env.PORT || 5000;

    const httpServer = app.listen(port, () => {
      console.log(`🚀 Server is running on port: ${port}`);
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

module.exports = { app };
