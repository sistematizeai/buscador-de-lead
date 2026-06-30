import { describe, expect, it } from "vitest";
import * as instagramProvider from "./instagram-dork.provider";

const normalizeInstagramProfileUrl = (instagramProvider as any).normalizeInstagramProfileUrl as
  | ((url: string) => string | null)
  | undefined;
const selectBestInstagramProfile = (instagramProvider as any).selectBestInstagramProfile as
  | ((
      results: Array<{ title: string; link: string; description?: string }>,
      businessName: string,
      location?: string,
    ) => string | null)
  | undefined;

describe("Instagram profile enrichment helpers", () => {
  it("normalizes only Instagram profile URLs and rejects posts or generic pages", () => {
    expect(normalizeInstagramProfileUrl?.("https://www.instagram.com/barrisstore/?igsh=abc")).toBe(
      "https://www.instagram.com/barrisstore",
    );
    expect(normalizeInstagramProfileUrl?.("https://instagram.com/p/C1234567890/")).toBeNull();
    expect(normalizeInstagramProfileUrl?.("https://www.instagram.com/reel/C1234567890/")).toBeNull();
    expect(normalizeInstagramProfileUrl?.("https://www.instagram.com/explore/locations/123/salvador/")).toBeNull();
  });

  it("selects the profile that best matches the business name and location", () => {
    const results = [
      {
        title: "Foto da Barris Store (@cliente) - Instagram",
        link: "https://www.instagram.com/p/C1234567890/",
        description: "Publicacao marcada em Salvador",
      },
      {
        title: "Barris Store Salvador (@barrisstore) - Instagram",
        link: "https://www.instagram.com/barrisstore/?hl=pt-br",
        description: "Loja no bairro Barris em Salvador Bahia",
      },
      {
        title: "Barris Noticias (@barrisnews) - Instagram",
        link: "https://www.instagram.com/barrisnews/",
        description: "Noticias do bairro",
      },
    ];

    expect(selectBestInstagramProfile?.(results, "Barris store", "Barris, Salvador - BA")).toBe(
      "https://www.instagram.com/barrisstore",
    );
  });
});
