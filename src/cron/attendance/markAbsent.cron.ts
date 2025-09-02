import nodeCron from "node-cron";
import { markAbsentForUsers } from "@/services/attendance.service";

export const markAbsentCron = () => {
  // Run at strategic times with date-specific processing:
  // - 8 AM: Process yesterday's overnight shifts (22:00-06:00)
  // - 4 PM: Process today's morning shifts (06:00-14:00)
  // - Midnight: Process yesterday's evening shifts (14:00-22:00)
  // Each run processes only ONE specific date to avoid duplicates
  nodeCron.schedule("0 8,16,0 * * 1-5", async () => {
    try {
      await markAbsentForUsers();
      console.log("Mark Absent cron job executed successfully");
    } catch (error) {
      console.error("Mark Absent cron job failed:", error);
    }
  });
};
