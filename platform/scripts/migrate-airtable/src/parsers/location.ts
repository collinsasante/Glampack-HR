export interface ParsedLocation {
  lat: number;
  lng: number;
  city: string | null;
  region: string | null;
  distanceFromOfficeM: number | null;
  method: "GPS" | "IPFallback";
}

// Matches the exact format written by attendance-tracker.html's locationString template:
// `${lat.toFixed(6)}, ${lng.toFixed(6)}, ${city}, ${region} (${distance.toFixed(1)}m from office)${locationMethod}`
// Confirmed against 5 real production rows: city/region are sometimes absent, a trailing
// "\n" is always present, and "(Network-based)" only appears when IP fallback was used
// (never seen in GPS-based samples, but the regex must not require its absence either).
const LOCATION_PATTERN =
  /^(-?\d+\.\d+),\s*(-?\d+\.\d+)(?:,\s*(.+?),\s*(.+?))?\s*\(([\d.]+)m from office\)\s*(\(Network-based\))?\s*$/;

export function parseLocationString(raw: string | undefined | null): ParsedLocation | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  const match = LOCATION_PATTERN.exec(cleaned);
  if (!match) return null;

  const [, latStr, lngStr, city, region, distanceStr, networkSuffix] = match;

  return {
    lat: Number(latStr),
    lng: Number(lngStr),
    city: city ?? null,
    region: region ?? null,
    distanceFromOfficeM: distanceStr ? Number(distanceStr) : null,
    method: networkSuffix ? "IPFallback" : "GPS",
  };
}
