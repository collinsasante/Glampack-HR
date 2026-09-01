export interface CustomLineItem {
  name: string;
  amount: number;
  isRecurring: boolean;
  monthsRemaining: number | null;
  totalMonths: number | null;
}

// admin.js itself wraps every JSON.parse of these fields in try/catch, implying malformed
// data has occurred in production before — mirror that defensiveness here rather than
// letting one bad row abort the whole migration.
export function parseCustomLineItems(raw: string | undefined | null): CustomLineItem[] {
  if (!raw || raw.trim() === "" || raw.trim() === "[]") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      name: typeof item.name === "string" ? item.name : "Unnamed",
      amount: typeof item.amount === "number" ? item.amount : Number(item.amount) || 0,
      isRecurring: Boolean(item.isRecurring),
      monthsRemaining: typeof item.monthsRemaining === "number" ? item.monthsRemaining : null,
      totalMonths: typeof item.totalMonths === "number" ? item.totalMonths : null,
    }));
}
