import Redis from "ioredis";

// Initialize Redis client
export const redis = new Redis();
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
