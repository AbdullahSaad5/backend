import { ebayMessageSync } from "./EbayMessageSync";
import { autoCheckoutCron } from "./attendance";
import { markAbsentCron } from "./attendance";
import { tokenRefreshCron } from "./token-refresh.cron";
import { GmailSyncCron } from "./gmail-sync.cron";

export function initCron() {
  autoCheckoutCron();
  markAbsentCron();
  ebayMessageSync();
  tokenRefreshCron();
  GmailSyncCron.start(); // Start the new Gmail sync cron jobs
}
