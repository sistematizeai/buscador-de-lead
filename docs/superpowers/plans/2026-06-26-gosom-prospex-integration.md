# Gosom Prospex Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use `gosom/google-maps-scraper` as the reliable Google Maps collection engine behind the existing Prospex campaign, CRM, export, and AI workflow.

**Architecture:** Keep the Prospex NestJS API as the product backend and add a scraper provider boundary. The current Playwright scraper remains available as fallback, while a new Gosom provider executes a local `gosom` binary, reads JSON output, normalizes it into Prospex lead data, and lets the existing scoring/content pipeline continue unchanged.

**Tech Stack:** NestJS, TypeScript, Prisma/PostgreSQL, Playwright fallback, local Go-built `gosom` binary, Node unit tests.

---

### Task 1: Toolchain And Local Gosom Binary

**Files:**
- Create: `tools/gosom/.gitkeep`
- Create: `tools/bin/.gitkeep`
- External local install: `C:\Users\AI\tools\go`

- [ ] Install or locate Go without depending on Docker, WSL, or winget.
- [ ] Clone or update `gosom/google-maps-scraper` outside the app source tree.
- [ ] Build a local Windows binary into `tools/bin/gosom-google-maps-scraper.exe`.
- [ ] Verify the binary responds to `-h`.

### Task 2: Scraper Provider Boundary

**Files:**
- Create: `apps/api/src/scraper/scraper-provider.interface.ts`
- Move/modify: `apps/api/src/scraper/google-maps.scraper.ts`
- Modify: `apps/api/src/scraper/scraper.module.ts`

- [ ] Define a shared `ScrapedBusiness` contract used by the processor.
- [ ] Define a `ScraperProvider` interface with `scrape(searchQuery, maxResults)`.
- [ ] Keep the current Playwright implementation behind that interface.

### Task 3: Gosom Output Normalization

**Files:**
- Create: `apps/api/src/scraper/providers/gosom-output.normalizer.ts`
- Test: `apps/api/src/scraper/providers/gosom-output.normalizer.spec.ts`

- [ ] Write failing tests for converting Gosom JSON fields into Prospex `ScrapedBusiness`.
- [ ] Cover `title`, `address`, `phone`, `web_site`, `review_rating`, `link`, `category`, and coordinates.
- [ ] Implement the normalizer only after the tests fail for missing implementation.

### Task 4: Gosom Provider

**Files:**
- Create: `apps/api/src/scraper/providers/gosom-google-maps.provider.ts`
- Test: `apps/api/src/scraper/providers/gosom-google-maps.provider.spec.ts`

- [ ] Write failing tests for command construction and JSON parsing.
- [ ] Implement binary path resolution from `GOSOM_BINARY_PATH`, then fallback to `tools/bin/gosom-google-maps-scraper.exe`.
- [ ] Execute Gosom with a temporary query file and JSON results file.
- [ ] Add timeout, max result limiting, and clear error logging.

### Task 5: Processor Integration

**Files:**
- Modify: `apps/api/src/scraper/scraper.processor.ts`
- Modify: `apps/api/src/scraper/scraper.module.ts`
- Modify: `apps/api/.env`
- Modify: `.env.example`

- [ ] Add provider selection through `SCRAPER_PROVIDER=gosom|playwright`.
- [ ] Use Gosom by default when the binary exists.
- [ ] Fall back to Playwright only when explicitly configured or when Gosom is unavailable.
- [ ] Remove silent mock fallback from production scraping paths.

### Task 6: Validation

**Files:**
- Modify: `package.json` or `apps/api/package.json` if a test command is missing.
- Create or modify docs if execution instructions change.

- [ ] Run unit tests for normalizer/provider.
- [ ] Run `pnpm build`.
- [ ] Check `git status`.
- [ ] Document exact commands needed to run locally with PostgreSQL and the Gosom binary.

