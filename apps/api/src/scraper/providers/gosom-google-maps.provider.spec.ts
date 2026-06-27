import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { GosomGoogleMapsProvider, resolveGosomBinaryPath } from "./gosom-google-maps.provider";

describe("GosomGoogleMapsProvider", () => {
  it("executes gosom with a query file and normalizes JSON results", async () => {
    const calls: Array<{ file: string; args: string[] }> = [];
    let queryFileContent = "";
    const provider = new GosomGoogleMapsProvider({
      binaryPath: "C:\\tools\\gosom.exe",
      timeoutMs: 5000,
      runCommand: async (file, args) => {
        calls.push({ file, args });
        const inputIndex = args.indexOf("-input");
        queryFileContent = await readFile(args[inputIndex + 1], "utf8");
        const resultsIndex = args.indexOf("-results");
        const resultsPath = args[resultsIndex + 1];
        await writeFile(
          resultsPath,
          JSON.stringify([
            {
              title: "Clinica Modelo",
              address: "Rua Saude, 55",
              phone: "+55 11 99999-0000",
              web_site: "https://clinica.example",
              review_rating: 4.9,
              link: "https://maps.google.com/?cid=123",
            },
          ]),
          "utf8",
        );
      },
    });

    const leads = await provider.scrape("clinicas em Sao Paulo", 10);

    expect(calls).toHaveLength(1);
    expect(calls[0].file).toBe("C:\\tools\\gosom.exe");
    expect(calls[0].args).toEqual(
      expect.arrayContaining(["-input", expect.any(String), "-results", expect.any(String), "-json", "-depth", "1"]),
    );
    expect(queryFileContent).toBe("clinicas em Sao Paulo\n");
    expect(leads).toEqual([
      expect.objectContaining({
        name: "Clinica Modelo",
        phone: "+55 11 99999-0000",
        website: "https://clinica.example",
        rating: "4.9",
      }),
    ]);
  });

  it("supports newline-delimited JSON emitted by gosom", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "gosom-provider-test-"));
    const resultFile = join(tempDir, "results.json");
    await writeFile(
      resultFile,
      '{"title":"A","review_rating":4.1}\n{"title":"B","review_rating":4.2}\n',
      "utf8",
    );

    const provider = new GosomGoogleMapsProvider({
      binaryPath: "fake.exe",
      runCommand: async (_file, args) => {
        const resultsPath = args[args.indexOf("-results") + 1];
        await writeFile(resultsPath, await readFile(resultFile, "utf8"), "utf8");
      },
    });

    await expect(provider.scrape("teste", 1)).resolves.toEqual([
      expect.objectContaining({ name: "A", rating: "4.1" }),
    ]);
  });

  it("resolves a configured relative binary path from ancestor directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "gosom-path-test-"));
    const nested = join(root, "apps", "api");
    const binary = join(root, "tools", "bin", "gosom.exe");
    await mkdir(join(root, "tools", "bin"), { recursive: true });
    await mkdir(nested, { recursive: true });
    await writeFile(binary, "", "utf8");

    expect(resolveGosomBinaryPath("tools/bin/gosom.exe", nested)).toBe(binary);
  });
});
