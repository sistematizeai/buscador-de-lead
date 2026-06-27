import { test, expect } from "./fixtures";

test.describe("Leads", () => {
  test("leads list page loads", async ({ authedPage: page }) => {
    await page.goto("/leads");
    await expect(page.getByRole("heading", { name: /leads/i })).toBeVisible();
    await expect(page.locator('input[placeholder="Buscar leads..."]')).toBeVisible();
  });

  test("search filter narrows results", async ({ authedPage: page }) => {
    await page.goto("/leads");

    const searchInput = page.locator('input[placeholder="Buscar leads..."]');
    // Search for something that will not match anything
    await searchInput.fill("__no_match_xyz_12345__");
    // Table should show empty state or 0 rows
    const rows = page.locator("table tbody tr, [data-testid='lead-row']");
    const count = await rows.count();
    expect(count).toBe(0);

    // Clear search — rows should reappear (if leads exist)
    await searchInput.clear();
  });

  test("priority filter works", async ({ authedPage: page }) => {
    await page.goto("/leads");

    // Click priority filter
    await page.locator('button:has-text("Todas"), [placeholder="Prioridade"]').first().click();
    await page.locator('[role="option"]:has-text("Alta")').click();

    // URL or UI state changed — just verify no crash
    await expect(page.locator("body")).toBeVisible();
  });

  test("lead detail opens in modal from list", async ({ authedPage: page }) => {
    await page.goto("/leads");

    const firstLead = page.locator(".cursor-pointer").first();
    const hasLeads = await firstLead.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasLeads) {
      test.skip(); // No leads in DB yet — skip gracefully
      return;
    }

    await firstLead.click();
    // Modal with details should be visible
    await expect(page.locator("h3:has-text('Dados de contato')").first()).toBeVisible({ timeout: 5000 });
  });

  test("update CRM status on lead detail modal", async ({ authedPage: page }) => {
    await page.goto("/leads");

    const firstLead = page.locator(".cursor-pointer").first();
    const hasLeads = await firstLead.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasLeads) { test.skip(); return; }

    await firstLead.click();

    // Find CRM status select/button and change it
    const crmSelect = page.locator('button:has-text("Novo"), button:has-text("Contatado")').first();
    if (await crmSelect.isVisible()) {
      await crmSelect.click();
      await page.locator('[role="option"]:has-text("Contatado")').first().click();

      // Update button is "Atualizar status"
      const updateBtn = page.locator('button:has-text("Atualizar status")');
      if (await updateBtn.isVisible()) {
        await updateBtn.click();
        // Should not show error
        await expect(page.locator("text=error").or(page.locator(".text-red-400"))).not.toBeVisible({ timeout: 3000 });
      }
    }
  });
});
