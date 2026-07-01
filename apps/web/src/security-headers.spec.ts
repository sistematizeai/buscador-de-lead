import { describe, expect, it } from "vitest";
import nextConfig, { securityHeaders } from "../next.config";

describe("web security headers", () => {
  it("defines production-safe security headers for all routes", async () => {
    const configuredHeaders = await nextConfig.headers?.();
    const rootHeaders = configuredHeaders?.find((item) => item.source === "/(.*)")?.headers ?? [];
    const byKey = Object.fromEntries(rootHeaders.map((header) => [header.key, header.value]));

    expect(rootHeaders).toEqual(securityHeaders);
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["Strict-Transport-Security"]).toContain("includeSubDomains");
    expect(byKey["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(byKey["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
  });
});
