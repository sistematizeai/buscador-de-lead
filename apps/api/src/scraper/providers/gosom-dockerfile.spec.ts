import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dockerfile = readFileSync(
  join(process.cwd(), "apps/api/Dockerfile"),
  "utf8",
);

describe("Gosom Render Dockerfile", () => {
  it("downloads the official Linux Gosom release binary into the API runtime image", () => {
    expect(dockerfile).toContain("ARG GOSOM_VERSION=1.16.1");
    expect(dockerfile).toContain(
      "google_maps_scraper-${GOSOM_VERSION}-linux-amd64",
    );
    expect(dockerfile).toContain(
      "https://github.com/gosom/google-maps-scraper/releases/download/v${GOSOM_VERSION}/${GOSOM_ASSET}",
    );
    expect(dockerfile).toContain(
      "chmod +x tools/bin/gosom-google-maps-scraper",
    );
    expect(dockerfile).toContain("tools/bin/gosom-google-maps-scraper --help");
  });

  it("does not compile Gosom from source during Render builds", () => {
    expect(dockerfile).not.toContain("golang:");
    expect(dockerfile).not.toContain("go mod download");
    expect(dockerfile).not.toContain("go build");
  });
});
