// redis.js
import Redis from "ioredis";
export const redis = new Redis();
//{
//   host: "localhost:8001", // Replace with your Redis container's host if it's different
//   port: 6379, // The port Redis is running on
//   // password: "your-redis-password", // Uncomment and add a password if your Redis instance is secured
//   db: 0, // You can change the DB number if necessary (default is 0)
// }

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (err) => {
  console.log("Redis error:", err);
});
