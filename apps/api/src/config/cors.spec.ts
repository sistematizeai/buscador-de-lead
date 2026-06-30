import { describe, expect, it } from "vitest";
import { getAllowedCorsOrigins, isCorsOriginAllowed } from "./cors";

describe("cors config", () => {
  it("allows the configured production app URL exactly", () => {
    const env = {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://buscador-lead.vercel.app/",
    };

    expect(getAllowedCorsOrigins(env)).toEqual(["https://buscador-lead.vercel.app"]);
    expect(isCorsOriginAllowed("https://buscador-lead.vercel.app", env)).toBe(true);
  });

  it("allows multiple explicit origins from CORS_ALLOWED_ORIGINS", () => {
    const env = {
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://app.example.com, https://preview.example.com/",
    };

    expect(isCorsOriginAllowed("https://app.example.com", env)).toBe(true);
    expect(isCorsOriginAllowed("https://preview.example.com", env)).toBe(true);
    expect(isCorsOriginAllowed("https://other.example.com", env)).toBe(false);
  });

  it("keeps localhost enabled outside production", () => {
    const env = { NODE_ENV: "development" };

    expect(isCorsOriginAllowed("http://localhost:3000", env)).toBe(true);
    expect(isCorsOriginAllowed("http://127.0.0.1:3000", env)).toBe(true);
  });

  it("can allow controlled preview host suffixes when explicitly configured", () => {
    const env = {
      NODE_ENV: "production",
      CORS_ALLOWED_HOST_SUFFIXES: "buscador-lead.vercel.app",
    };

    expect(isCorsOriginAllowed("https://preview.buscador-lead.vercel.app", env)).toBe(true);
    expect(isCorsOriginAllowed("https://attacker.vercel.app", env)).toBe(false);
  });
});
