import { test, expect } from "@playwright/test";

test.describe("Map", () => {
  test("renders the leaflet map with stubbed posts", async ({ page }) => {
    await page.route("**/api/v1/posts?limit=200", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          posts: [
            {
              id: "507f1f77bcf86cd799439011",
              status: "OPEN",
              description: "Sticle de test",
              bottleCount: 25,
              estimatedValue: 12.5,
              collectorSharePercent: 30,
              latitude: 44.4268,
              longitude: 26.1025,
              locationName: "București",
              images: [],
              createdAt: new Date().toISOString(),
              expiresAt: null,
              availabilitySchedule: null,
              author: {
                id: "bbbbbbbbbbbbbbbbbbbbbbbb",
                name: "Ana",
                image: null,
                reputationScore: 5,
                ratingCount: 3,
              },
            },
          ],
        }),
      });
    });

    await page.goto("/map");
    // Leaflet mounts a .leaflet-container once the client map is ready.
    await expect(page.locator(".leaflet-container")).toBeVisible({
      timeout: 15_000,
    });
  });
});
