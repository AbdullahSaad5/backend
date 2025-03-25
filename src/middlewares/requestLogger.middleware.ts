// import { logger } from "@/utils/logger.util";
// import { Log } from "@/models";
// import { Request, Response, NextFunction } from "express";
// import { LogData } from "@/contracts/log.contract";

// // Middleware to log every request along with the user information if available
// export const requestLogger = async (req: Request, res: Response, next: NextFunction) => {
//   const { method, url, headers } = req;
//   const ip = req.ip || req.connection.remoteAddress;
//   const userAgent = headers["user-agent"];
//   const start = Date.now();

//   res.on("finish", async () => {
//     const duration = Date.now() - start; // Calculate response duration
//     const statusCode = res.statusCode;

//     // Prepare log data
//     const logData: LogData = {
//       ip,
//       method,
//       route: url,
//       statusCode,
//       duration,
//       userAgent,
//     };

//     if (req.user) {
//       // If a user is logged in, include their ID, first name, and last name
//       logData.userId = req.user._id;
//       logData.firstName = req.user.firstName; // Assuming user object has firstName
//       logData.lastName = req.user.lastName; // Assuming user object has lastName
//     }

//     // Save the log to the MongoDB database
//     try {
//       await Log.create(logData);
//       logger.info(
//         `Logged request to ${url} | Method: ${method} | Status Code: ${statusCode} | Duration: ${duration}ms`
//       );
//     } catch (error: any) {
//       logger.error("Error saving log to database: " + error.message);
//     }
//   });

//   next();
// };
