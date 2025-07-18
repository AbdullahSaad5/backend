import nodeCron from "node-cron";
import { markAbsentForUsers } from "../../services/attendance.service";

export const markAbsentCron = () => {
  nodeCron.schedule("* */2 * * * *", async () => {
    await markAbsentForUsers();
    console.log("Mark Absent cron job executed");
  });
};
