# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: leads.spec.ts >> Leads >> update CRM status on lead detail modal
- Location: tests\e2e\leads.spec.ts:52:7

# Error details

```
Test timeout of 60000ms exceeded while setting up "authedPage".
```

```
Error: page.goto: Target page, context or browser has been closed
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [active]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - navigation [ref=e7]:
            - button "previous" [disabled] [ref=e8]:
              - img "previous" [ref=e9]
            - generic [ref=e11]:
              - generic [ref=e12]: 1/
              - text: "1"
            - button "next" [disabled] [ref=e13]:
              - img "next" [ref=e14]
          - img
        - generic [ref=e16]:
          - generic [ref=e17]:
            - img [ref=e18]
            - generic "Latest available version is detected (16.2.9)." [ref=e20]: Next.js 16.2.9
            - generic [ref=e21]: Turbopack
          - img
      - dialog "Runtime ReferenceError" [ref=e23]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e30]: Runtime ReferenceError
              - generic [ref=e31]:
                - button "Copy Error Info" [ref=e32] [cursor=pointer]:
                  - img [ref=e33]
                - button "No related documentation found" [disabled] [ref=e35]:
                  - img [ref=e36]
                - button "Attach Node.js inspector" [ref=e38] [cursor=pointer]:
                  - img [ref=e39]
            - generic [ref=e48]: useState is not defined
          - generic [ref=e49]:
            - generic [ref=e50]:
              - paragraph [ref=e52]:
                - img [ref=e54]
                - generic [ref=e58]: src/hooks/use-auth.ts (14:27) @ useAuth
                - button "Open in editor" [ref=e59] [cursor=pointer]:
                  - img [ref=e61]
              - generic [ref=e64]:
                - generic [ref=e65]: 12 |
                - generic [ref=e66]: "13 | export function useAuth() {"
                - generic [ref=e67]: "> 14 | const [user, setUser] = useState<AuthUser | null>(null);"
                - generic [ref=e68]: "| ^"
                - generic [ref=e69]: 15 | const [workspace, setWorkspace] = useState<AuthWorkspace | null>(null);
                - generic [ref=e70]: 16 | const [loading, setLoading] = useState(true);
                - generic [ref=e71]: 17 |
            - generic [ref=e72]:
              - generic [ref=e73]:
                - paragraph [ref=e74]:
                  - text: Call Stack
                  - generic [ref=e75]: "16"
                - button "Show 13 ignore-listed frame(s)" [ref=e76] [cursor=pointer]:
                  - text: Show 13 ignore-listed frame(s)
                  - img [ref=e77]
              - generic [ref=e79]:
                - generic [ref=e80]:
                  - text: useAuth
                  - button "Open useAuth in editor" [ref=e81] [cursor=pointer]:
                    - img [ref=e82]
                - text: src/hooks/use-auth.ts (14:27)
              - generic [ref=e84]:
                - generic [ref=e85]:
                  - text: LoginForm
                  - button "Open LoginForm in editor" [ref=e86] [cursor=pointer]:
                    - img [ref=e87]
                - text: src/components/auth/login-form.tsx (22:16)
              - generic [ref=e89]:
                - generic [ref=e90]:
                  - text: LoginPage
                  - button "Open LoginPage in editor" [ref=e91] [cursor=pointer]:
                    - img [ref=e92]
                - text: src\app\(auth)\login\page.tsx (14:9)
        - generic [ref=e94]: "1"
        - generic [ref=e95]: "2"
    - generic [ref=e100] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e101]:
        - img [ref=e102]
      - generic [ref=e105]:
        - button "Open issues overlay" [ref=e106]:
          - generic [ref=e107]:
            - generic [ref=e108]: "0"
            - generic [ref=e109]: "1"
          - generic [ref=e110]: Issue
        - button "Collapse issues badge" [ref=e111]:
          - img [ref=e112]
  - generic [ref=e115]:
    - img [ref=e116]
    - heading "This page couldn’t load" [level=1] [ref=e118]
    - paragraph [ref=e119]: Reload to try again, or go back.
    - generic [ref=e120]:
      - button "Reload" [ref=e122] [cursor=pointer]
      - button "Back" [ref=e123] [cursor=pointer]
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
> 51 |     await page.goto("/register");
     |                ^ Error: page.goto: Target page, context or browser has been closed
  52 |     await page.fill("#name", user.name);
  53 |     await page.fill("#workspace", user.workspace);
  54 |     await page.fill("#reg-email", user.email);
  55 |     await page.fill("#reg-password", user.password);
  56 |     await page.click('button[type="submit"]');
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