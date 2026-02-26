interface GeoLocation {
  lat: number;
  lon: number;
  name: string;
}

const CITY_LOOKUP: Record<string, GeoLocation> = {
  "new york": { lat: 40.7128, lon: -74.006, name: "New York" },
  "los angeles": { lat: 34.0522, lon: -118.2437, name: "Los Angeles" },
  chicago: { lat: 41.8781, lon: -87.6298, name: "Chicago" },
  london: { lat: 51.5074, lon: -0.1278, name: "London" },
  paris: { lat: 48.8566, lon: 2.3522, name: "Paris" },
  tokyo: { lat: 35.6762, lon: 139.6503, name: "Tokyo" },
  sydney: { lat: -33.8688, lon: 151.2093, name: "Sydney" },
  dubai: { lat: 25.2048, lon: 55.2708, name: "Dubai" },
  rome: { lat: 41.9028, lon: 12.4964, name: "Rome" },
  berlin: { lat: 52.52, lon: 13.405, name: "Berlin" },
  moscow: { lat: 55.7558, lon: 37.6173, name: "Moscow" },
  beijing: { lat: 39.9042, lon: 116.4074, name: "Beijing" },
  mumbai: { lat: 19.076, lon: 72.8777, name: "Mumbai" },
  "san francisco": { lat: 37.7749, lon: -122.4194, name: "San Francisco" },
  seattle: { lat: 47.6062, lon: -122.3321, name: "Seattle" },
  toronto: { lat: 43.6532, lon: -79.3832, name: "Toronto" },
  "rio de janeiro": { lat: -22.9068, lon: -43.1729, name: "Rio de Janeiro" },
  singapore: { lat: 1.3521, lon: 103.8198, name: "Singapore" },
  cairo: { lat: 30.0444, lon: 31.2357, name: "Cairo" },
  istanbul: { lat: 41.0082, lon: 28.9784, name: "Istanbul" },
};

// In-memory cache for Nominatim results to avoid repeated lookups
const nominatimCache = new Map<string, GeoLocation>();

/**
 * Look up a city by name. Tries local lookup table first,
 * then in-memory cache, then falls back to Nominatim API.
 */
export async function geocode(city: string): Promise<GeoLocation> {
  const key = city.toLowerCase().trim();

  // Check local lookup table
  if (CITY_LOOKUP[key]) {
    return CITY_LOOKUP[key];
  }

  // Check in-memory cache
  if (nominatimCache.has(key)) {
    return nominatimCache.get(key)!;
  }

  // Fallback to Nominatim
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: { "User-Agent": "cesiumjs-mcp/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.statusText}`);
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (results.length === 0) {
    throw new Error(`Could not geocode city: ${city}`);
  }

  const location: GeoLocation = {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    name: results[0].display_name.split(",")[0],
  };

  nominatimCache.set(key, location);
  return location;
}
