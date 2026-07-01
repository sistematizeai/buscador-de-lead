import fs from "node:fs";
import path from "node:path";
import { log, error as logError } from "node:console";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { URL } from "node:url";
import { PrismaClient } from "@prisma/client";

const retries = Number(process.env.DB_HEALTH_RETRIES ?? 5);
const retryDelayMs = Number(process.env.DB_HEALTH_RETRY_DELAY_MS ?? 2500);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index);
    const rawValue = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = rawValue;
    }
  }
}

function redactUrl(rawUrl) {
  if (!rawUrl) {
    return { present: false };
  }

  try {
    const url = new URL(rawUrl);
    return {
      present: true,
      host: url.hostname,
      port: url.port || null,
      database: url.pathname.replace(/^\//, ""),
      usernamePresent: Boolean(url.username),
      passwordPresent: Boolean(url.password),
    };
  } catch {
    return { present: true, parseable: false };
  }
}

function stringify(value) {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === "bigint" ? Number(item) : item),
    2,
  );
}

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), "../../packages/database/.env"));

const prisma = new PrismaClient();

const modelCounters = [
  ["workspaces", () => prisma.workspace.count()],
  ["users", () => prisma.user.count()],
  ["members", () => prisma.workspaceMember.count()],
  ["sessions", () => prisma.session.count()],
  ["accounts", () => prisma.account.count()],
  ["verifications", () => prisma.verification.count()],
  ["passwordResetTokens", () => prisma.passwordResetToken.count()],
  ["securityAuditLogs", () => prisma.securityAuditLog.count()],
  ["companySearchLogs", () => prisma.companySearchLog.count()],
  ["campaigns", () => prisma.campaign.count()],
  ["leads", () => prisma.lead.count()],
  ["leadActivities", () => prisma.leadActivity.count()],
  ["followUps", () => prisma.followUp.count()],
  ["contacts", () => prisma.contact.count()],
  ["integrations", () => prisma.integration.count()],
  ["apiKeys", () => prisma.apiKey.count()],
];

async function collectHealth() {
  const ping = await prisma.$queryRaw`SELECT 1::int AS ok`;
  const dbInfoRows = await prisma.$queryRaw`
    SELECT current_database() AS database_name, current_schema() AS schema_name, version() AS version
  `;

  const counts = {};
  for (const [name, counter] of modelCounters) {
    counts[name] = await counter();
  }

  const tables = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('workspaces','users','workspace_members','sessions','accounts','verifications','password_reset_tokens','security_audit_logs','company_search_logs','campaigns','leads','lead_activities','follow_ups','contacts','integrations','api_keys')
    ORDER BY tablename
  `;

  const leadDedupeRows = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS total,
      COUNT("dedupeKey")::int AS with_key,
      (COUNT(*) - COUNT("dedupeKey"))::int AS without_key,
      COUNT(DISTINCT "dedupeKey") FILTER (WHERE "dedupeKey" IS NOT NULL)::int AS distinct_keys
    FROM leads
  `;

  const duplicateKeyRows = await prisma.$queryRaw`
    SELECT "workspaceId", "dedupeKey", COUNT(*)::int AS total
    FROM leads
    WHERE "dedupeKey" IS NOT NULL
    GROUP BY "workspaceId", "dedupeKey"
    HAVING COUNT(*) > 1
    LIMIT 10
  `;

  const indexRows = await prisma.$queryRaw`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND indexdef ILIKE '%dedupeKey%'
    ORDER BY indexname
  `;

  const orphanChecks = await prisma.$queryRaw`
    SELECT 'campaigns_without_workspace' AS check_name, COUNT(*)::int AS total
      FROM campaigns c LEFT JOIN workspaces w ON w.id = c."workspaceId" WHERE w.id IS NULL
    UNION ALL
    SELECT 'leads_without_workspace', COUNT(*)::int
      FROM leads l LEFT JOIN workspaces w ON w.id = l."workspaceId" WHERE w.id IS NULL
    UNION ALL
    SELECT 'leads_with_broken_campaign', COUNT(*)::int
      FROM leads l LEFT JOIN campaigns c ON c.id = l."campaignId" WHERE l."campaignId" IS NOT NULL AND c.id IS NULL
    UNION ALL
    SELECT 'members_without_user', COUNT(*)::int
      FROM workspace_members wm LEFT JOIN users u ON u.id = wm."userId" WHERE u.id IS NULL
    UNION ALL
    SELECT 'members_without_workspace', COUNT(*)::int
      FROM workspace_members wm LEFT JOIN workspaces w ON w.id = wm."workspaceId" WHERE w.id IS NULL
    UNION ALL
    SELECT 'accounts_without_user', COUNT(*)::int
      FROM accounts a LEFT JOIN users u ON u.id = a."userId" WHERE u.id IS NULL
  `;

  const sentinel = `health-check-${Date.now()}`;
  await prisma.workspace.deleteMany({ where: { slug: { startsWith: "health-check-" } } });
  const created = await prisma.workspace.create({
    data: { name: sentinel, slug: sentinel, plan: "free" },
    select: { id: true, slug: true },
  });
  const readBack = await prisma.workspace.count({ where: { id: created.id, slug: sentinel } });
  const deleted = await prisma.workspace.deleteMany({ where: { id: created.id } });
  const leftover = await prisma.workspace.count({ where: { slug: sentinel } });

  const failedOrphanChecks = orphanChecks.filter((row) => Number(row.total) > 0);

  return {
    ok:
      ping[0]?.ok === 1 &&
      tables.length === 16 &&
      duplicateKeyRows.length === 0 &&
      indexRows.length > 0 &&
      failedOrphanChecks.length === 0 &&
      readBack === 1 &&
      deleted.count === 1 &&
      leftover === 0,
    datasource: {
      databaseUrl: redactUrl(process.env.DATABASE_URL),
      directUrl: redactUrl(process.env.DIRECT_URL),
    },
    database: dbInfoRows[0]
      ? {
          name: dbInfoRows[0].database_name,
          schema: dbInfoRows[0].schema_name,
          version: String(dbInfoRows[0].version).split(" on ")[0],
        }
      : null,
    counts,
    expectedTablesFound: tables.length,
    tables: tables.map((row) => row.tablename),
    leadDedupe: leadDedupeRows[0] ?? null,
    duplicateLeadKeyGroups: duplicateKeyRows.length,
    dedupeIndexes: indexRows.map((row) => row.indexname),
    orphanChecks,
    writeReadDeleteTest: {
      created: Boolean(created.id),
      readBackCount: readBack,
      deletedCount: deleted.count,
      leftoverRowsAfterCleanup: leftover,
      ok: Boolean(created.id) && readBack === 1 && deleted.count === 1 && leftover === 0,
    },
  };
}

let lastError;
for (let attempt = 1; attempt <= retries; attempt += 1) {
  try {
    const started = Date.now();
    const result = await collectHealth();
    result.attempt = attempt;
    result.elapsedMs = Date.now() - started;
    log(stringify(result));
    await prisma.$disconnect();
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    lastError = error;
    logError(`attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`);
    if (attempt < retries) {
      await delay(retryDelayMs * attempt);
    }
  }
}

try {
  await prisma.workspace.deleteMany({ where: { slug: { startsWith: "health-check-" } } });
} catch {
  // Best-effort cleanup after connection failures.
}

await prisma.$disconnect();
throw lastError;
