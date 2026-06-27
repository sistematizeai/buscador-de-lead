# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.ts >> Settings >> create API key → appears in list
- Location: tests\e2e\settings.spec.ts:10:7

# Error details

```
Test timeout of 60000ms exceeded while setting up "authedPage".
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button[type="submit"]')
    - locator resolved to <button type="submit" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 px-4 py-2 w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 h-10">Criar conta</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - img [ref=e8]
          - img [ref=e16]
        - generic [ref=e19]:
          - generic [ref=e20]:
            - img [ref=e21]
            - generic [ref=e24]: Buscador de Lead
          - paragraph [ref=e25]: IA para prospecção local
      - heading "Bem-vindo de volta" [level=1] [ref=e26]
      - paragraph [ref=e27]: Entre no seu workspace
    - generic [ref=e29]:
      - generic [ref=e30]:
        - generic [ref=e31]:
          - img [ref=e32]
          - text: E-mail ou senha inválidos
        - generic [ref=e34]:
          - text: E-mail
          - textbox "E-mail" [ref=e35]:
            - /placeholder: voce@empresa.com
            - text: e2e-1782573301897-3489@prospex.test
        - generic [ref=e36]:
          - text: Senha
          - textbox "Senha" [ref=e37]:
            - /placeholder: ••••••••
            - text: TestPass123!
      - generic [ref=e38]:
        - button "Entrar" [ref=e39] [cursor=pointer]
        - paragraph [ref=e40]:
          - text: Ainda não tem conta?
          - link "Criar conta" [ref=e41] [cursor=pointer]:
            - /url: /register
  - button "Open Next.js Dev Tools" [ref=e47] [cursor=pointer]:
    - img [ref=e48]
  - alert [ref=e51]
```

# Test source

```ts
  1  | import { test as base, expect, type Page } from "@playwright/test";
  2  | 
  3  | // Unique per test run — avoids conflicts if DB is shared between runs
  4  | const RUN_ID = Date.now();
  5  | 
  6  | export const TEST_USER = {
  7  |   name: `E2E User ${RUN_ID}`,
  8  |   email: `e2e-${RUN_ID}@prospex.test`,
  9  |   password: "TestPass123!",
  10 |   workspace: `E2E Workspace ${RUN_ID}`,
  11 | };
  12 | 
  13 | /** Register + login once, reuse page state in each test */
  14 | export const test = base.extend<{ authedPage: Page }>({
  15 |   authedPage: async ({ page }, use) => {
  16 |     await registerAndLogin(page, TEST_USER);
  17 |     await use(page);
  18 |   },
  19 | });
  20 | 
  21 | export { expect };
  22 | 
  23 | let currentUniqueId: string | null = null;
  24 | 
  25 | function getUniqueId() {
  26 |   if (!currentUniqueId) {
  27 |     currentUniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  28 |   }
  29 |   return currentUniqueId;
  30 | }
  31 | 
  32 | export async function registerAndLogin(
  33 |   page: Page,
  34 |   user: typeof TEST_USER,
  35 | ): Promise<void> {
  36 |   const uniqueId = getUniqueId();
  37 |   user.name = `E2E User ${uniqueId}`;
  38 |   user.workspace = `E2E Workspace ${uniqueId}`;
  39 |   user.email = `e2e-${uniqueId}@prospex.test`;
  40 | 
  41 |   // Try logging in first
  42 |   await page.goto("/login");
  43 |   await page.fill("#email", user.email);
  44 |   await page.fill("#password", user.password);
  45 |   await page.click('button[type="submit"]');
  46 | 
  47 |   try {
  48 |     await page.waitForURL("/dashboard", { timeout: 60000 });
  49 |   } catch {
  50 |     // If login failed, register the user
  51 |     await page.goto("/register");
  52 |     await page.fill("#name", user.name);
  53 |     await page.fill("#workspace", user.workspace);
  54 |     await page.fill("#reg-email", user.email);
  55 |     await page.fill("#reg-password", user.password);
> 56 |     await page.click('button[type="submit"]');
     |                ^ Error: page.click: Test timeout of 60000ms exceeded.
  57 |     await page.waitForURL("/dashboard", { timeout: 60000 });
  58 |   }
  59 | }
  60 | 
  61 | export async function loginOnly(page: Page, user: typeof TEST_USER): Promise<void> {
  62 |   await page.goto("/login");
  63 |   await page.fill("#email", user.email);
  64 |   await page.fill("#password", user.password);
  65 |   await page.click('button[type="submit"]');
  66 |   await page.waitForURL("/dashboard", { timeout: 60000 });
  67 | }
  68 | 
```