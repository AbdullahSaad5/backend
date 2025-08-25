import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});
// Initialize Redis client
export const redis = new Redis({
  host: process.env.REDIS_HOST, // Replace with your Redis Cloud host
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined, // Replace with your Redis Cloud port
  username: process.env.REDIS_USERNAME, // Replace with your Redis Cloud username
  password: process.env.REDIS_PASSWORD, // Replace with your Redis Cloud password
  // tls: {},
  db: 0, // Enables SSL/TLS for secure connection);
});

// console.log('REDIS_HOST:', process.env.REDIS_HOST);
// console.log('REDIS_PORT:', process.env.REDIS_PORT);
//   {
//   host: "localhost", // Replace with your Redis container's host
//   port: 6379, // Default Redis port
//   db: 0, // Default Redis database (optional)
// }

// Connection event listeners
redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (err) => {
  console.log("Redis error:", err);
});

// Function to cache combinations with TTL (Time-To-Live)
export const setCacheWithTTL = (key: string, value: any, ttlInSeconds: number) => {
  return redis.setex(key, ttlInSeconds, JSON.stringify(value));
};

// Function to get cached data
export const getCache = (key: any) => {
  return redis.get(key);
};

// Function to delete a key from cache
export const deleteCache = (key: any) => {
  return redis.del(key);
};
