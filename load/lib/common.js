import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

// Target under test. Point this at a PRODUCTION build (`next build && next start`)
// backed by real MongoDB + Redis — dev-mode numbers are meaningless.
export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Custom metrics so every scenario reports the same, comparable signals.
export const rateLimited = new Counter("rate_limited_429");
export const serverErrors = new Counter("server_errors_5xx");

// Read-only endpoints. These never mutate data, so the suite is safe to run
// against a populated database. Write paths (create/claim/complete) require an
// authenticated session and are covered separately — see load/README.md.
export const READ_ENDPOINTS = [
  "/api/v1/posts?limit=100",
  "/api/v1/leaderboard",
  "/api/v1/leaderboard?page=1&limit=20",
];

// A distinct simulated client IP per VU. The API rate-limits per client IP
// (read from X-Forwarded-For), so without this every request shares one bucket
// and the test just measures the limiter instead of real throughput.
export function clientHeaders(vu = __VU || 0) {
  const b = (vu >> 8) & 0xff;
  const c = vu & 0xff;
  return {
    headers: {
      "X-Forwarded-For": `10.${b}.${c}.1`,
      Accept: "application/json",
    },
  };
}

/** Fixed IP — used only by the rate-limit scenario to hit ONE bucket on purpose. */
export function singleClientHeaders() {
  return {
    headers: {
      "X-Forwarded-For": "203.0.113.7",
      Accept: "application/json",
    },
  };
}

/**
 * Classify a response the way the "does it cede under load?" question needs:
 *  - 2xx            -> healthy
 *  - 429            -> the app is *shedding* load on purpose (good/controlled)
 *  - 5xx / timeout  -> the app is *ceding* (bad)
 */
export function classify(res) {
  if (res.status === 429) rateLimited.add(1);
  if (res.status >= 500 || res.status === 0) serverErrors.add(1);
  check(res, {
    "not a server error (no 5xx / timeout)": (r) => r.status !== 0 && r.status < 500,
    "handled (2xx or 429)": (r) =>
      (r.status >= 200 && r.status < 300) || r.status === 429,
  });
  return res;
}

/** Hit one random read endpoint as a distinct simulated client. */
export function hitReadEndpoint() {
  const path = READ_ENDPOINTS[Math.floor(Math.random() * READ_ENDPOINTS.length)];
  const res = http.get(`${BASE_URL}${path}`, clientHeaders());
  return classify(res);
}

// Shared SLO thresholds. Override the p95 target with e.g. `-e P95_MS=500`.
export const P95_MS = Number(__ENV.P95_MS || 800);

export const SLO_THRESHOLDS = {
  // Under normal load, real failures (5xx/timeout) must stay under 1%.
  http_req_failed: ["rate<0.01"],
  http_req_duration: [`p(95)<${P95_MS}`],
  // The app must never actually crash under a scenario's designed load.
  server_errors_5xx: ["count<1"],
};
