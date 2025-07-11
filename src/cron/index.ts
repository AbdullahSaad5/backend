import { every10Second } from "./Every10Second";
import { anotherCron } from "./AnotherCron";

export function initCron() {
  every10Second();
  anotherCron();
}
