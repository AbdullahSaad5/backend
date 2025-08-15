import dotenv from "dotenv";
import express, { Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { mongoose } from "./datasources";
import { authMiddleware, corsMiddleware, apiRateLimiter } from "./middlewares";
import { router } from "./routes/index.route";
import { websiteRouter } from "./routes/website-router";
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

// Connect to MongoDB
mongoose.run();

seedData()
  .then(() => {
    console.log("Database seeded successfully.");
  })
  .catch((error) => {
    console.error("Error seeding database:", error);
  });

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

// Client-side website routes
app.use("/web", websiteRouter);

initCron();
const port = process.env.PORT || 5000;
const httpServer = app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

// Add socket.io to the server

// Option 1: Using initialize()
// socketManager.initialize(httpServer);
// socket.run(httpServer);
socketManager.run(httpServer);

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
