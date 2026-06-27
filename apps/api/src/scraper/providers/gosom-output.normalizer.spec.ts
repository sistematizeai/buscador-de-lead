import { describe, expect, it } from "vitest";
import { normalizeGosomEntries } from "./gosom-output.normalizer";

describe("normalizeGosomEntries", () => {
  it("maps rich gosom Google Maps entries into LeadSync scraped businesses", () => {
    const entries = [
      {
        title: "Padaria Central",
        address: "Rua Alfa, 123 - Campinas, SP",
        phone: "+55 19 98888-7777",
        web_site: "https://padariacentral.example",
        review_rating: 4.7,
        link: "https://www.google.com/maps/place/padaria-central",
        category: "Bakery",
        categories: ["Bakery", "Cafe"],
        latitude: -22.9056,
        longitude: -47.0608,
      },
    ];

    expect(normalizeGosomEntries(entries)).toEqual([
      {
        name: "Padaria Central",
        address: "Rua Alfa, 123 - Campinas, SP",
        phone: "+55 19 98888-7777",
        website: "https://padariacentral.example",
        rating: "4.7",
        hasWebsite: true,
        referenceLink: "https://www.google.com/maps/place/padaria-central",
        source: "Google Maps",
        category: "Bakery",
        latitude: -22.9056,
        longitude: -47.0608,
      },
    ]);
  });

  it("drops entries without a usable business name and keeps website status accurate", () => {
    const entries = [
      { title: "", address: "Invalid" },
      { name: "Loja Sem Site", address: "Av. Brasil, 10", rating: "N/A" },
    ];

    expect(normalizeGosomEntries(entries)).toEqual([
      {
        name: "Loja Sem Site",
        address: "Av. Brasil, 10",
        phone: "",
        website: "",
        rating: "N/A",
        hasWebsite: false,
        referenceLink: "",
        source: "Google Maps",
        category: "",
        latitude: undefined,
        longitude: undefined,
      },
    ]);
  });
});
