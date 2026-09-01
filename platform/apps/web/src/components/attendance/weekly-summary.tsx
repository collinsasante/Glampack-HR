"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceStatus } from "@/lib/attendance-status";
import type { AttendanceRecord } from "@/lib/api/attendance";

function startOfWeek() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // back up to Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return monday;
}

const DOT_COLOR: Record<string, string> = {
  Present: "bg-emerald-600",
  Late: "bg-amber-600",
  Incomplete: "bg-muted-foreground",
  Absent: "bg-red-500",
};

export function WeeklySummary({
  records,
  onSelect,
}: {
  records: AttendanceRecord[];
  onSelect: (record: AttendanceRecord) => void;
}) {
  const monday = startOfWeek();
  const today = new Date();
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {days.map((d) => {
            const dStr = d.toISOString().slice(0, 10);
            const record = records.find((r) => r.date.slice(0, 10) === dStr);
            const isFuture = d > today;
            const status = record ? attendanceStatus(record) : isFuture ? null : "Absent";
            const label = d.toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });

            return (
              <li key={dStr}>
                <button
                  type="button"
                  disabled={!record}
                  onClick={() => record && onSelect(record)}
                  className="flex w-full items-center justify-between py-2.5 text-left text-sm first:pt-0 last:pb-0 disabled:cursor-default"
                >
                  <span className="text-foreground">{label}</span>
                  {status ? (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLOR[status]}`} />
                      {status}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
