import { markAbsentCron, autoCheckoutCron } from "./attendance";

export const initCron = () => {
  markAbsentCron();
  autoCheckoutCron();
};
