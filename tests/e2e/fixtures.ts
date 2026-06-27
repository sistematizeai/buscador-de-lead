import { test as base, expect, type Page } from "@playwright/test";

// Unique per test run — avoids conflicts if DB is shared between runs
const RUN_ID = Date.now();

export const TEST_USER = {
  name: `E2E User ${RUN_ID}`,
  email: `e2e-${RUN_ID}@prospex.test`,
  password: "TestPass123!",
  workspace: `E2E Workspace ${RUN_ID}`,
};

/** Register + login once, reuse page state in each test */
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await registerAndLogin(page, TEST_USER);
    await use(page);
  },
});

export { expect };

let currentUniqueId: string | null = null;

function getUniqueId() {
  if (!currentUniqueId) {
    currentUniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  return currentUniqueId;
}

export async function registerAndLogin(
  page: Page,
  user: typeof TEST_USER,
): Promise<void> {
  const uniqueId = getUniqueId();
  user.name = `E2E User ${uniqueId}`;
  user.workspace = `E2E Workspace ${uniqueId}`;
  user.email = `e2e-${uniqueId}@prospex.test`;

  // Try logging in first
  await page.goto("/login");
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL("/dashboard", { timeout: 60000 });
  } catch {
    // If login failed, register the user
    await page.goto("/register");
    await page.fill("#name", user.name);
    await page.fill("#workspace", user.workspace);
    await page.fill("#reg-email", user.email);
    await page.fill("#reg-password", user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard", { timeout: 60000 });
  }
}

export async function loginOnly(page: Page, user: typeof TEST_USER): Promise<void> {
  await page.goto("/login");
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 60000 });
}
