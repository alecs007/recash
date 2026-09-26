import { sleep } from "k6";
import { hitReadEndpoint, P95_MS } from "./lib/common.js";

// Stress test: keep raising the load in steps well beyond expected peak to find
// the breaking point — the level at which latency balloons or 5xx/timeouts
// start. Unlike the load test, breaching a threshold here is INFORMATIVE, not a
// failure: the goal is to discover where the app cedes.
//
// Watch for: the leaderboard endpoint fetches ALL users and sorts in memory, so
// it is expected to degrade first as the user table grows.
const STEP = Number(__ENV.STEP || 100);

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: STEP },
        { duration: "1m", target: STEP * 2 },
        { duration: "1m", target: STEP * 3 },
        { duration: "1m", target: STEP * 4 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "15s",
    },
  },
  thresholds: {
    // Marked non-abort: we want the run to finish and report where it broke.
    http_req_duration: [{ threshold: `p(95)<${P95_MS * 3}`, abortOnFail: false }],
    server_errors_5xx: [{ threshold: "count<1", abortOnFail: false }],
  },
};

export default function stress() {
  hitReadEndpoint();
  sleep(0.5);
}
