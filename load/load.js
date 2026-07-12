import { sleep } from "k6";
import { hitReadEndpoint, SLO_THRESHOLDS } from "./lib/common.js";

// Load test: simulate a realistic sustained traffic level and assert the app
// meets its SLOs (p95 latency + error rate) the whole time. This answers
// "does it stay healthy at expected scale?".
//
// Tune the peak with `-e VUS=100`.
const PEAK = Number(__ENV.VUS || 50);

export const options = {
  scenarios: {
    steady: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: PEAK }, // ramp up
        { duration: "2m", target: PEAK }, // hold at peak
        { duration: "30s", target: 0 }, // ramp down
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: SLO_THRESHOLDS,
};

export default function () {
  hitReadEndpoint();
  sleep(Math.random() * 1 + 0.5); // 0.5–1.5s think time per user
}
