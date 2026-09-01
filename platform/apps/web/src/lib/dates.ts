export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Attendance/leave dates from the API are UTC calendar dates ("YYYY-MM-DDT00:00:00.000Z").
// Building a day list with local-timezone `Date.setDate()`/`getDate()` and then
// reading it back via `toISOString()` can shift a bucket by a day depending on the
// browser's timezone and time of day — so this stays UTC-only end to end.
export function lastNDaysUtc(n: number): Date[] {
  const todayUtcMidnight = new Date(`${todayStr()}T00:00:00.000Z`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Array.from({ length: n }, (_, i) => new Date(todayUtcMidnight - (n - 1 - i) * dayMs));
}

export type DateRangePreset = "today" | "week" | "month" | "lastMonth";

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
];

export function resolveDateRange(preset: DateRangePreset): { from: string; to: string; label: string } {
  const today = new Date(`${todayStr()}T00:00:00.000Z`);

  if (preset === "today") {
    return { from: todayStr(), to: todayStr(), label: "Today" };
  }
  if (preset === "week") {
    const day = today.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() + diff);
    return {
      from: monday.toISOString().slice(0, 10),
      to: todayStr(),
      label: "This Week",
    };
  }
  if (preset === "lastMonth") {
    const firstOfThisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 24 * 60 * 60 * 1000);
    const firstOfPrevMonth = new Date(Date.UTC(lastOfPrevMonth.getUTCFullYear(), lastOfPrevMonth.getUTCMonth(), 1));
    return {
      from: firstOfPrevMonth.toISOString().slice(0, 10),
      to: lastOfPrevMonth.toISOString().slice(0, 10),
      label: "Last Month",
    };
  }
  // month
  const firstOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  return { from: firstOfMonth.toISOString().slice(0, 10), to: todayStr(), label: "This Month" };
}
