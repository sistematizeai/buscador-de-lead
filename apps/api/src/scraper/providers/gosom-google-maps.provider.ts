import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import type { ScrapedBusiness, ScraperProvider } from "../scraper-provider.interface";
import { normalizeGosomEntries } from "./gosom-output.normalizer";

const execFileAsync = promisify(execFile);

export type GosomCommandRunner = (file: string, args: string[], timeoutMs: number) => Promise<void>;

export interface GosomProviderOptions {
  binaryPath?: string;
  timeoutMs?: number;
  depth?: number;
  runCommand?: GosomCommandRunner;
}

export const GOSOM_PROVIDER_OPTIONS = Symbol("GOSOM_PROVIDER_OPTIONS");

@Injectable()
export class GosomGoogleMapsProvider implements ScraperProvider {
  private readonly logger = new Logger(GosomGoogleMapsProvider.name);
  private readonly binaryPath: string;
  private readonly timeoutMs: number;
  private readonly depth: number;
  private readonly runCommand: GosomCommandRunner;
  private readonly requiresLocalBinary: boolean;

  constructor(@Optional() @Inject(GOSOM_PROVIDER_OPTIONS) options: GosomProviderOptions = {}) {
    this.binaryPath = resolveGosomBinaryPath(options.binaryPath || process.env.GOSOM_BINARY_PATH);
    this.timeoutMs = options.timeoutMs ?? Number(process.env.GOSOM_TIMEOUT_MS || 120000);
    this.depth = options.depth ?? Number(process.env.GOSOM_DEPTH || 1);
    this.runCommand = options.runCommand ?? defaultRunCommand;
    this.requiresLocalBinary = !options.runCommand;
  }

  isAvailable(): boolean {
    return existsSync(this.binaryPath);
  }

  async scrape(searchQuery: string, maxResults = 20): Promise<ScrapedBusiness[]> {
    if (this.requiresLocalBinary && !this.isAvailable()) {
      throw new Error(`Binário do Gosom não encontrado em ${this.binaryPath}`);
    }

    const tempDir = await mkdtemp(join(tmpdir(), "leadsync-gosom-"));
    const inputPath = join(tempDir, "queries.txt");
    const resultsPath = join(tempDir, "results.json");

    await writeFile(inputPath, `${sanitizeQuery(searchQuery)}\n`, "utf8");

    const args = [
      "-input",
      inputPath,
      "-results",
      resultsPath,
      "-json",
      "-depth",
      String(this.depth),
      "-c",
      "1",
      "-exit-on-inactivity",
      "45s",
    ];

    try {
      await this.runCommand(this.binaryPath, args, this.timeoutMs);
      const raw = await readFile(resultsPath, "utf8");
      return normalizeGosomEntries(parseGosomJson(raw)).slice(0, maxResults);
    } catch (error) {
      this.logger.error(`Busca do Gosom falhou para "${searchQuery}": ${String(error)}`);
      throw error;
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

async function defaultRunCommand(file: string, args: string[], timeoutMs: number): Promise<void> {
  await execFileAsync(file, args, {
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 10,
  });
}

function parseGosomJson(raw: string): unknown[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}

function sanitizeQuery(searchQuery: string): string {
  return String(searchQuery)
    .replace(/[\x00-\x1f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 300);
}

export function resolveDefaultGosomBinaryPath(): string {
  const fileName = process.platform === "win32"
    ? "gosom-google-maps-scraper.exe"
    : "gosom-google-maps-scraper";

  return resolveGosomBinaryPath(join("tools", "bin", fileName));
}

export function resolveGosomBinaryPath(configuredPath?: string, startDir = process.cwd()): string {
  const fileName = process.platform === "win32"
    ? "gosom-google-maps-scraper.exe"
    : "gosom-google-maps-scraper";
  const requestedPath = configuredPath || join("tools", "bin", fileName);

  if (resolve(requestedPath) === requestedPath) {
    return requestedPath;
  }

  let current = startDir;
  for (let i = 0; i < 6; i++) {
    const candidate = join(current, requestedPath);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return resolve(startDir, requestedPath);
}
