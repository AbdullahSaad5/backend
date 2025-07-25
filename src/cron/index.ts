import { ebayMessageSync } from "./EbayMessageSync";
import { autoCheckoutCron } from "./attendance";
import { markAbsentCron } from "./attendance";

export function initCron() {
  autoCheckoutCron();
  markAbsentCron();
  ebayMessageSync();
}
