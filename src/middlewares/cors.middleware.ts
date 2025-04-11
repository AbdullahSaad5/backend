import cors from "cors";
import { StatusCodes } from "http-status-codes";

export const corsMiddleware = cors({
  // origin: ["https://bavit-test.vercel.app", "http://localhost:3000","http://localhost:3001", "https://bavit-dev.vercel.app", "https://512l06gl-3000.inc1.devtunnels.ms"], // Allows requests from any origin
  origin: "*", // Allows requests from any origin
  // methods: ["GET", "POST","PATCH", "PUT", "DELETE", "OPTIONS"], // Allow these methods
  // allowedHeaders: ["Content-Type", "Authorization", "x-user-type"], // Allow these headers
  // credentials: true, // Allows sending cookies if needed
  optionsSuccessStatus: StatusCodes.OK, // Ensure proper status code
});
