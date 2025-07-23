import cron from "node-cron";

export function every10Second() {
  cron.schedule("*/10 * * * * *", () => {
    // console.log("Hello every 10 seconds!");
  });
}
