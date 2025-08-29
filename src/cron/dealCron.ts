import cron from "node-cron";
// import { checkAndUpdateDeals } from "../services/dealService";
import { dealsService } from "@/services/deals.service";
export const startDealCron = (): void => {
    // Run every day at midnight
    // cron.schedule("0 0 * * *", async ()
    cron.schedule("* * * * *", async () => {

        try {
            const { expired } = await dealsService.checkAndUpdateDeals();
            console.log(`Deals updated ->  Expired: ${expired}`);
        } catch (err) {
            if (err instanceof Error) {
                console.error("Error running deal cron:", err.message);
            } else {
                console.error("Unknown error running deal cron:", err);
            }
        }
    });
};
