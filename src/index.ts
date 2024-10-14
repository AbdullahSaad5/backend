import dotenv from "dotenv";
import express, { Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { mongoose } from "./datasources";
import { socketManager } from "./datasources/socket.datasource";
import { authMiddleware, corsMiddleware } from "./middlewares";
import { router } from "./routes/index.route";
import Stripe from "stripe";
import { stripeController } from "./controllers/stripe.controller";

// Configure dotenv to use .env file like .env.dev or .env.prod
dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});

const app: Express = express();

// Connect to MongoDB
mongoose.run();

// const accessLogStream = fs.createWriteStream(__dirname + "/access.log", { flags: "a" });

// This route is specifically handled before the express.json() middleware to allow raw JSON requests
// from Stripe webhook
// Don't remove this route from here
// I tried to move this route to the stripe.route.ts file but it didn't work
// So, I had to keep it here
// To make sure it keeps working, don't remove this route from here
app.post("/api/stripe/handle-webhook", express.raw({ type: "application/json" }), stripeController.webhookHandler);

app.use(
  express.json({ limit: "10mb" }),
  express.urlencoded({ limit: "10mb", extended: true }),
  morgan("dev"),
  // morgan("combined", { stream: accessLogStream }),
  corsMiddleware,
  authMiddleware,
  helmet()
);

app.use("/api", router);

const port = process.env.PORT || 5000;

const httpServer = app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

// Add socket.io to the server
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
