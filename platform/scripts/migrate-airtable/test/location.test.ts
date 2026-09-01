import { describe, expect, it } from "vitest";
import { parseLocationString } from "../src/parsers/location.js";

describe("parseLocationString", () => {
  it("parses a real GPS-based row with city/region and trailing newline", () => {
    const result = parseLocationString("5.787025, -0.129389, Accra, Greater Accra Region (21355.2m from office)\n");
    expect(result).toEqual({
      lat: 5.787025,
      lng: -0.129389,
      city: "Accra",
      region: "Greater Accra Region",
      distanceFromOfficeM: 21355.2,
      method: "GPS",
    });
  });

  it("parses a row with no city/region (attendance-tracker.html defaults cityInfo to an empty string, not a placeholder comma, when unavailable)", () => {
    const result = parseLocationString("5.786999, -0.129387 (21352.5m from office)\n");
    expect(result).not.toBeNull();
    expect(result!.city).toBeNull();
    expect(result!.region).toBeNull();
    expect(result!.distanceFromOfficeM).toBeCloseTo(21352.5);
  });

  it("parses the IP-fallback suffix when present", () => {
    const result = parseLocationString("5.6, -0.19, Accra, Greater Accra Region (12.0m from office) (Network-based)");
    expect(result?.method).toBe("IPFallback");
  });

  it("returns null for empty/missing input rather than throwing", () => {
    expect(parseLocationString(undefined)).toBeNull();
    expect(parseLocationString(null)).toBeNull();
    expect(parseLocationString("")).toBeNull();
  });

  it("returns null for unparseable garbage instead of throwing", () => {
    expect(parseLocationString("not a location string")).toBeNull();
  });
});
