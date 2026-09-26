import http from "k6/http";
import { check } from "k6";
import { BASE_URL, singleClientHeaders, classify } from "./lib/common.js";

// Rate-limit / overload behaviour test.
//
// This is the direct answer to "what happens when it's overloaded?". We flood
// the public feed from ONE client IP, far above the 60 req/min public limit.
// A well-behaved app SHEDS load with 429 (controlled) rather than CEDING with
// 5xx or timeouts. So here we WANT to see lots of 429s and ZERO server errors.
export const options = {
  scenarios: {
    flood: {
      executor: "constant-arrival-rate",
      rate: 50, // 50 requests/second from a single IP...
      timeUnit: "1s",
      duration: "30s", // ...for 30s => ~1500 reqs vs a 60/min budget
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    // The limiter must engage: expect a large share of 429s.
    rate_limited_429: ["count>100"],
    // Shedding load must not mean crashing.
    server_errors_5xx: ["count<1"],
    // 429 is a valid, handled outcome — it must NOT count as a failed request
    // for our purposes, so we only assert there are no true server failures.
  },
};

export default function ratelimit() {
  const res = http.get(
    `${BASE_URL}/api/v1/posts?limit=100`,
    singleClientHeaders(),
  );
  classify(res);
  check(res, {
    "responded (no timeout)": (r) => r.status !== 0,
  });
}
