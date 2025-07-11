import cron from "node-cron";

export function anotherCron() {
  cron.schedule("*/10 * * * * *", () => {
    console.log("mark user attendance!");
  });
}
