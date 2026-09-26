import { sleep } from "k6";
import { hitReadEndpoint } from "./lib/common.js";

// Spike test: a sudden burst of traffic (e.g. a post goes viral) followed by a
// return to normal. Tests two things: does the app survive the spike, and does
// it RECOVER afterwards (latency/errors return to baseline)?
const SPIKE = Number(__ENV.VUS || 400);

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { duration: "20s", target: 5 }, // baseline
        { duration: "15s", target: SPIKE }, // sudden spike
        { duration: "45s", target: SPIKE }, // sustain the burst
        { duration: "15s", target: 5 }, // drop back
        { duration: "45s", target: 5 }, // recovery window
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    // Recovery matters more than perfection during the burst; keep 5xx at zero.
    server_errors_5xx: [{ threshold: "count<1", abortOnFail: false }],
  },
};

export default function spike() {
  hitReadEndpoint();
  sleep(0.5);
}
