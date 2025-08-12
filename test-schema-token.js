const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: ".env.dev" });

console.log("🔍 Environment variables:");
console.log("AMAZON_TOKEN_ENV:", process.env.AMAZON_TOKEN_ENV);
console.log("SELLING_PARTNER_APP_CLIENT_ID_PROD:", process.env.SELLING_PARTNER_APP_CLIENT_ID_PROD ? "SET" : "NOT SET");
console.log(
  "SELLING_PARTNER_APP_CLIENT_SECRET_PROD:",
  process.env.SELLING_PARTNER_APP_CLIENT_SECRET_PROD ? "SET" : "NOT SET"
);

// Test the scope generation
const SCOPES = [
  "sellingpartnerapi::notifications",
  "sellingpartnerapi::catalog",
  "sellingpartnerapi::product",
  "sellingpartnerapi::orders",
  "sellingpartnerapi::definitions",
  "sellingpartnerapi::product-types",
];

console.log("\n🔍 Scopes that will be used:");
console.log("Space-separated:", SCOPES.join(" "));
console.log("Comma-separated:", SCOPES.join(","));

console.log("\n🔍 Expected endpoint for production:");
console.log("Auth:", "https://api.amazon.com/auth/o2/token");
console.log("SP-API:", "https://sellingpartnerapi-eu.amazon.com");

console.log("\n🔍 Expected endpoint for sandbox:");
console.log("Auth:", "https://api.amazon.com/auth/o2/token");
console.log("SP-API:", "https://sandbox.sellingpartnerapi-eu.amazon.com");

console.log("\n🔍 Refresh tokens available:");
console.log("Production:", process.env.AMAZON_REFRESH_TOKEN_PROD ? "SET" : "NOT SET");
console.log("Sandbox:", process.env.AMAZON_REFRESH_TOKEN_SANDBOX ? "SET" : "NOT SET");
