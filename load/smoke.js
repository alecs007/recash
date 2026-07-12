import { sleep } from "k6";
import { hitReadEndpoint, SLO_THRESHOLDS } from "./lib/common.js";

// Smoke test: minimal load to prove the endpoints work and the SLOs are sane
// before running anything heavier. Run this first.
export const options = {
  vus: 1,
  duration: "30s",
  thresholds: SLO_THRESHOLDS,
};

export default function () {
  hitReadEndpoint();
  sleep(1);
}
