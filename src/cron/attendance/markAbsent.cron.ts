import nodeCron from "node-cron";
import { markAbsentForUsers } from "@/services/attendance.service";

export const markAbsentCron = () => {
  // Run every 2 hours to handle different shift end times:
  // - Morning shifts (6 AM - 2 PM) processed around 4 PM
  // - Evening shifts (2 PM - 10 PM) processed around 12 AM
  // - Overnight shifts (10 PM - 6 AM) processed around 8 AM
  nodeCron.schedule("0 */2 * * 1-5", async () => {
    await markAbsentForUsers();
    console.log("Mark Absent cron job executed");
  });
};
