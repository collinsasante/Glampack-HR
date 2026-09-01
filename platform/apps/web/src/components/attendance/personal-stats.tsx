"use client";

import { Card, CardContent } from "@/components/ui/card";
import { attendanceDurationMinutes, attendanceStatus } from "@/lib/attendance-status";
import type { AttendanceRecord } from "@/lib/api/attendance";

function isWeekday(d: Date) {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

export function PersonalAttendanceStats({ monthRecords }: { monthRecords: AttendanceRecord[] }) {
  const now = new Date();
  const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  let weekdaysElapsed = 0;
  for (let d = new Date(firstOfMonth); d <= now; d.setUTCDate(d.getUTCDate() + 1)) {
    if (isWeekday(d)) weekdaysElapsed += 1;
  }

  const presentDays = monthRecords.filter((r) => r.checkInTime).length;
  const lateDays = monthRecords.filter((r) => attendanceStatus(r) === "Late").length;
  const totalMinutes = monthRecords.reduce((sum, r) => sum + attendanceDurationMinutes(r), 0);
  const rate = weekdaysElapsed > 0 ? Math.round((presentDays / weekdaysElapsed) * 100) : 0;

  const cards = [
    { label: "Attendance Rate", value: `${rate}%`, footnote: "This month" },
    { label: "Present", value: `${presentDays} days`, footnote: "This month" },
    { label: "Late", value: `${lateDays} day${lateDays === 1 ? "" : "s"}`, footnote: "This month" },
    {
      label: "Hours Worked",
      value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      footnote: "This month",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="py-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{c.label}</p>
            <p className="font-heading mt-1 text-2xl font-bold tabular-nums text-foreground">{c.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.footnote}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
