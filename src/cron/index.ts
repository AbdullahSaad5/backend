import { ebayMessageSync } from "./EbayMessageSync";
import { autoCheckoutCron } from "./attendance";
import { markAbsentCron } from "./attendance";
import { tokenRefreshCron } from "./token-refresh.cron";

export function initCron() {
  autoCheckoutCron();
  markAbsentCron();
  ebayMessageSync();
  tokenRefreshCron();
}
