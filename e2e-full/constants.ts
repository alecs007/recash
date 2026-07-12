import path from "node:path";

export const E2E_PORT = 3200;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
// Fixed secret for the ephemeral test backend only — never a production value.
export const AUTH_SECRET = "e2e-full-flow-secret-not-used-in-production";
// NextAuth v5 session cookie name on http (non-secure) origins; also the
// salt used when encoding the JWT.
export const COOKIE_NAME = "authjs.session-token";
export const STATE_FILE = path.join(process.cwd(), "e2e-full", ".state.json");
