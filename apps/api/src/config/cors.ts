import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

const LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

type EnvLike = Record<string, string | undefined>;

function parseList(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, "");
  }
}

function hostnameFromOrigin(origin: string) {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function getAllowedCorsOrigins(env: EnvLike = process.env) {
  const configured = [env.NEXT_PUBLIC_APP_URL, ...parseList(env.CORS_ALLOWED_ORIGINS)].filter(Boolean) as string[];
  const origins = env.NODE_ENV === "production" ? configured : [...configured, ...LOCAL_ORIGINS];

  return Array.from(new Set(origins.map(normalizeOrigin)));
}

export function isCorsOriginAllowed(origin: string | undefined, env: EnvLike = process.env) {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  if (getAllowedCorsOrigins(env).includes(normalizedOrigin)) return true;

  const hostname = hostnameFromOrigin(normalizedOrigin);
  const allowedSuffixes = parseList(env.CORS_ALLOWED_HOST_SUFFIXES).map((suffix) =>
    suffix.replace(/^\*\./, "").replace(/^\./, "").toLowerCase(),
  );

  return allowedSuffixes.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
}

export function buildCorsOptions(env: EnvLike = process.env): CorsOptions {
  return {
    credentials: true,
    origin(origin, callback) {
      if (isCorsOriginAllowed(origin, env)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
  };
}
