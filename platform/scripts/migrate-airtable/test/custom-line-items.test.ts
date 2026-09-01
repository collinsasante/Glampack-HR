import { describe, expect, it } from "vitest";
import { parseCustomLineItems } from "../src/parsers/custom-line-items.js";

describe("parseCustomLineItems", () => {
  it("returns an empty array for the real-world common case: an empty JSON array string", () => {
    expect(parseCustomLineItems("[]")).toEqual([]);
  });

  it("returns an empty array for null/undefined/blank", () => {
    expect(parseCustomLineItems(null)).toEqual([]);
    expect(parseCustomLineItems(undefined)).toEqual([]);
    expect(parseCustomLineItems("")).toEqual([]);
  });

  it("parses a real-shaped custom allowance entry", () => {
    const raw = JSON.stringify([
      { name: "Loan Repayment Bonus", amount: 100, isRecurring: false },
      { name: "Transport Top-up", amount: 50, isRecurring: true, monthsRemaining: 2, totalMonths: 3 },
    ]);
    const result = parseCustomLineItems(raw);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      name: "Transport Top-up",
      amount: 50,
      isRecurring: true,
      monthsRemaining: 2,
      totalMonths: 3,
    });
  });

  it("does not throw on malformed JSON — returns empty array instead", () => {
    expect(parseCustomLineItems("{not valid json")).toEqual([]);
  });

  it("ignores non-object entries in the array instead of crashing", () => {
    expect(parseCustomLineItems('["just a string", 42, null]')).toEqual([]);
  });
});
