const { getAmazonAccessToken } = require("./dist/utils/amazon-helpers.util");

async function testAmazonToken() {
  console.log("🧪 Testing Amazon token initialization...");

  try {
    const token = await getAmazonAccessToken();
    if (token) {
      console.log("✅ Success! Token obtained:", {
        access_token: token.access_token ? token.access_token.substring(0, 20) + "..." : "null",
        token_type: token.token_type,
        expires_in: token.expires_in,
      });
    } else {
      console.log("❌ Failed to get token - returned null");
    }
  } catch (error) {
    console.error("❌ Error during token initialization:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

testAmazonToken();
