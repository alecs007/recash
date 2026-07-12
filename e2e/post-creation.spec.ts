import { test, expect } from "@playwright/test";

test.describe("Create-post flow (guard)", () => {
  test("redirects unauthenticated users away from /post with an auth prompt", async ({
    page,
  }) => {
    await page.goto("/post");
    // The server component redirects to /?auth=1 when there is no session; the
    // auth modal then consumes and strips the query param, so the URL settles on
    // the homepage. What matters for the guard is that the user is bounced off
    // /post back to the root — never allowed to reach the create-post page.
    await expect(page).toHaveURL(/localhost:3100\/(\?.*)?$/);
    expect(new URL(page.url()).pathname).toBe("/");
  });
});

/**
 * The authenticated create -> claim -> approve -> complete-with-code flow needs
 * a signed session cookie + a seeded MongoDB/Redis backend. It is intentionally
 * left as a documented TODO (see e2e/README.md) for the "light" E2E scope.
 */
test.describe("Create-post flow (authenticated)", () => {
  test.skip("author fills the form and publishes a post", async () => {
    // Requires test-auth session injection and a running backend.
  });
});
