import { env } from "../config/env.js";

// Haversine formula — matches attendance-tracker.html's calculateDistance() exactly,
// so migrated historical distances and newly-computed ones stay consistent.
export function distanceFromOfficeMeters(lat: number, lng: number): number {
  const R = 6371e3;
  const phi1 = (lat * Math.PI) / 180;
  const phi2 = (env.OFFICE_LATITUDE * Math.PI) / 180;
  const deltaPhi = ((env.OFFICE_LATITUDE - lat) * Math.PI) / 180;
  const deltaLambda = ((env.OFFICE_LONGITUDE - lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
