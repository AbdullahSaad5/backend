import { IntegrationTokenModel } from "@/models/integration-token.model";

export const cleanupTokenCollections = async () => {
  try {
    // No longer nuking all tokens; keep user tokens intact
    // Optionally, remove only obviously invalid legacy records if needed
    // await IntegrationTokenModel.deleteMany({ provider: "ebay", useClient: { $exists: false } });
  } catch (error) {
    console.error("❌ Error cleaning up token collections:", error);
  }
};
