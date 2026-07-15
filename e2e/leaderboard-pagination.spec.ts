import { test, expect, type Page } from "@playwright/test";

const LIMIT = 20;
const TOTAL = 250;
const TOTAL_PAGES = Math.ceil(TOTAL / LIMIT); // 13

function pagePayload(page: number) {
  const start = (page - 1) * LIMIT;
  const count = Math.min(LIMIT, TOTAL - start);
  return {
    entries: Array.from({ length: count }, (_, i) => ({
      rank: start + i + 1,
      id: `user-${start + i + 1}`,
      name: `Reciclator ${start + i + 1}`,
      image: null,
      certified: false,
      totalBottles: 1000 - (start + i),
      reputationScore: 4.5,
      ratingCount: 3,
    })),
    total: TOTAL,
    page,
    totalPages: TOTAL_PAGES,
  };
}

async function stubLeaderboard(page: Page) {
  await page.route("**/api/v1/leaderboard**", async (route) => {
    const url = new URL(route.request().url());
    const p = parseInt(url.searchParams.get("page") ?? "1") || 1;
    await route.fulfill({ json: pagePayload(p) });
  });
}

const NAV = { name: /paginare|pagination/i };

test.describe("Leaderboard pagination", () => {
  test("renders numbered pagination and navigates between pages", async ({
    page,
  }) => {
    await stubLeaderboard(page);
    await page.goto("/leaderboard");

    // Page 1 content
    await expect(page.getByText("Reciclator 1", { exact: true })).toBeVisible();

    const nav = page.getByRole("navigation", NAV);
    await expect(nav).toBeVisible();

    // Page 1 layout: 1 2 3 4 5 … 13 — last page reachable directly
    for (const i of [1, 2, 3, 4, 5, TOTAL_PAGES]) {
      await expect(
        nav.getByRole("button", { name: `Pagina ${i}`, exact: true }),
      ).toBeVisible();
    }

    // Current page marked, prev disabled on first page
    await expect(
      nav.getByRole("button", { name: "Pagina 1", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      nav.getByRole("button", { name: /anterioară|previous/i }),
    ).toBeDisabled();

    // Jump straight to page 3 (not possible with prev/next-only pagination)
    await nav.getByRole("button", { name: "Pagina 3", exact: true }).click();
    await expect(
      page.getByText("Reciclator 41", { exact: true }),
    ).toBeVisible();
    await expect(
      nav.getByRole("button", { name: "Pagina 3", exact: true }),
    ).toHaveAttribute("aria-current", "page");

    // Next -> page 4
    await nav.getByRole("button", { name: /următoare|next/i }).click();
    await expect(
      page.getByText("Reciclator 61", { exact: true }),
    ).toBeVisible();

    // Step to a middle page — endpoints stay visible: 1 … 6 7 8 … 13
    for (const step of [5, 6, 7]) {
      await nav
        .getByRole("button", { name: `Pagina ${step}`, exact: true })
        .click();
      await expect(
        nav.getByRole("button", { name: `Pagina ${step}`, exact: true }),
      ).toHaveAttribute("aria-current", "page");
    }
    for (const i of [1, 6, 7, 8, TOTAL_PAGES]) {
      await expect(
        nav.getByRole("button", { name: `Pagina ${i}`, exact: true }),
      ).toBeVisible();
    }

    // Last page: next disabled
    await nav
      .getByRole("button", { name: `Pagina ${TOTAL_PAGES}`, exact: true })
      .click();
    await expect(
      page.getByText(`Reciclator ${TOTAL}`, { exact: true }),
    ).toBeVisible();
    await expect(
      nav.getByRole("button", { name: /următoare|next/i }),
    ).toBeDisabled();
  });

  test("preloads adjacent pages into the SWR cache", async ({ page }) => {
    const requested: number[] = [];
    await page.route("**/api/v1/leaderboard**", async (route) => {
      const url = new URL(route.request().url());
      const p = parseInt(url.searchParams.get("page") ?? "1") || 1;
      requested.push(p);
      await route.fulfill({ json: pagePayload(p) });
    });

    await page.goto("/leaderboard");
    await expect(page.getByText("Reciclator 1", { exact: true })).toBeVisible();

    // Page 2 is prefetched right after page 1 loads
    await expect.poll(() => requested).toContain(2);
  });

  test("keeps first and last page visible on mobile without overflow", async ({
    page,
  }) => {
    await stubLeaderboard(page);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/leaderboard");

    await expect(page.getByText("Reciclator 1", { exact: true })).toBeVisible();

    const nav = page.getByRole("navigation", NAV);

    // Move to a middle page — mobile uses a 5-slot layout: < 1 … 5 … 13 >
    await nav.getByRole("button", { name: "Pagina 3", exact: true }).click();
    await expect(
      nav.getByRole("button", { name: "Pagina 3", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    for (const step of [4, 5]) {
      await nav.getByRole("button", { name: /următoare|next/i }).click();
      await expect(
        nav.getByRole("button", { name: `Pagina ${step}`, exact: true }),
      ).toHaveAttribute("aria-current", "page");
    }

    for (const i of [1, 5, TOTAL_PAGES]) {
      await expect(
        nav.getByRole("button", { name: `Pagina ${i}`, exact: true }),
      ).toBeVisible();
    }
    // Siblings are dropped on mobile in favor of full-size buttons
    await expect(
      nav.getByRole("button", { name: "Pagina 4", exact: true }),
    ).toHaveCount(0);
    await expect(
      nav.getByRole("button", { name: "Pagina 6", exact: true }),
    ).toHaveCount(0);

    // The strip fits the viewport on a single row
    const box = await nav.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(360);
    const prevBox = await nav
      .getByRole("button", { name: /anterioară|previous/i })
      .boundingBox();
    const nextBox = await nav
      .getByRole("button", { name: /următoare|next/i })
      .boundingBox();
    expect(Math.abs(prevBox!.y - nextBox!.y)).toBeLessThan(2);

    // No horizontal page scroll
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
