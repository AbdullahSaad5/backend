// logger.ts
import winston from "winston";

// Create a custom log format
export const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Create the logger
export const logger = winston.createLogger({
  level: "info", // Minimum level to log (info, warn, error, etc.)
  format: winston.format.combine(winston.format.timestamp(), logFormat),
  transports: [
    // Log to the console
    new winston.transports.Console({ format: winston.format.simple() }),
    // Log to a file (logfile.log)
    new winston.transports.File({ filename: "logs/app.log" }),
  ],
});
