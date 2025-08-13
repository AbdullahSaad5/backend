import { IntegrationTokenModel } from "@/models/integration-token.model";

export const cleanupTokenCollections = async () => {
  try {
    console.log("🧹 Cleaning up token collections...");
    
    // Delete all existing tokens to start fresh
    await IntegrationTokenModel.deleteMany({});
    console.log("✅ Cleared all existing tokens");
    
    // Now the system will create only application tokens (useClient: false)
    // when tokens are needed
    console.log("✅ Token collections cleaned up. New tokens will be application tokens only.");
  } catch (error) {
    console.error("❌ Error cleaning up token collections:", error);
  }
};
