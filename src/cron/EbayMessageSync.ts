import cron from "node-cron";
import { EbayChatService } from "@/services/ebay-chat.service";
import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";

export const ebayMessageSync = () => {
    // Run every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        try {
            console.log("🔄 Starting eBay message sync cron job...");

            // Check if we have valid eBay credentials
            const token = await getStoredEbayAccessToken();
            if (!token) {
                console.log("⚠️ No eBay access token found, skipping sync");
                return;
            }

            // Get seller username from environment or config
            const sellerUsername = process.env.EBAY_SELLER_USERNAME;
            if (!sellerUsername) {
                console.log("⚠️ No eBay seller username configured, skipping sync");
                return;
            }

            // Sync messages
            await EbayChatService.syncEbayMessages(sellerUsername);

            console.log("✅ eBay message sync completed successfully");
        } catch (error) {
            console.error("❌ Error in eBay message sync cron job:", error);
        }
    });

    console.log("📅 eBay message sync cron job scheduled (every 5 minutes)");
}; 