import type { ScrapedBusiness } from "../scraper-provider.interface";

type GosomEntry = Record<string, unknown>;

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function ratingValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return "N/A";
}

function firstString(values: unknown): string {
  if (!Array.isArray(values)) return "";
  const first = values.find((value) => typeof value === "string" && value.trim());
  return typeof first === "string" ? first.trim() : "";
}

export function normalizeGosomEntries(entries: unknown[]): ScrapedBusiness[] {
  return entries
    .filter((entry): entry is GosomEntry => !!entry && typeof entry === "object")
    .map((entry): ScrapedBusiness | null => {
      const name = stringValue(entry.title) || stringValue(entry.name);
      if (!name) return null;

      const website = stringValue(entry.web_site) || stringValue(entry.website);
      const longitude = numberValue(entry.longitude) ?? numberValue(entry.longtitude);

      return {
        name,
        address: stringValue(entry.address),
        phone: stringValue(entry.phone),
        website,
        rating: ratingValue(entry.review_rating ?? entry.rating),
        hasWebsite: !!website,
        referenceLink: stringValue(entry.link),
        source: "Google Maps",
        category: stringValue(entry.category) || firstString(entry.categories),
        latitude: numberValue(entry.latitude),
        longitude,
      };
    })
    .filter((entry): entry is ScrapedBusiness => entry !== null);
}
