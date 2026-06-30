export interface ScrapedBusiness {
  name: string;
  address: string;
  phone: string;
  website: string;
  instagramUrl?: string;
  rating: string;
  hasWebsite: boolean;
  referenceLink: string;
  source: string;
  category?: string;
  latitude?: number;
  longitude?: number;
}

export interface ScraperProvider {
  scrape(searchQuery: string, maxResults?: number): Promise<ScrapedBusiness[]>;
}
