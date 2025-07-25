import nodeCron from "node-cron";
import { autoCheckoutForUsers } from "@/services/attendance.service";

export const autoCheckoutCron = () => {
  nodeCron.schedule("0 0 */2 * * *", async () => {
    await autoCheckoutForUsers();
    console.log("Auto Checkout cron job executed");
  });
};
