"use client";

import { useEffect, useState } from "react";
import { AttendanceTrendChart, type TrendPoint } from "@/components/attendance/attendance-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listAttendance } from "@/lib/api/attendance";
import { listEmployees } from "@/lib/api/employees";
import { listLeaveRequests } from "@/lib/api/leave-requests";
import { lastNDaysUtc } from "@/lib/dates";
import { cn } from "@/lib/utils";

const RANGES = [
  { value: 90, label: "Last 3 months" },
  { value: 30, label: "Last 30 days" },
  { value: 7, label: "Last 7 days" },
] as const;

// Org-wide present-employee count over the selected window — computed the same
// way as the /attendance page's trend chart (real check-ins + real approved
// leave, bucketed in UTC), just with a switchable range instead of a fixed 14 days.
export function AttendanceOverviewChart() {
  const [range, setRange] = useState<number>(7);
  const [data, setData] = useState<TrendPoint[] | null>(null);

  useEffect(() => {
    setData(null);
    (async () => {
      const days = lastNDaysUtc(range);
      const [employees, rangeRecords, approvedLeave] = await Promise.all([
        listEmployees(),
        listAttendance({
          from: days[0]!.toISOString().slice(0, 10),
          to: days[days.length - 1]!.toISOString().slice(0, 10),
        }),
        listLeaveRequests({ status: "Approved" }),
      ]);
      const activeCount = employees.filter((e) => e.accountStatus === "Active").length;

      const points: TrendPoint[] = days.map((d) => {
        const dStr = d.toISOString().slice(0, 10);
        const dayRecords = rangeRecords.filter((r) => r.date.slice(0, 10) === dStr);
        const present = new Set(dayRecords.filter((r) => r.checkInTime).map((r) => r.employeeId)).size;
        const onLeave = new Set(
          approvedLeave.filter((lr) => new Date(lr.startDate) <= d && d <= new Date(lr.endDate)).map((lr) => lr.employeeId)
        ).size;
        return {
          date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }),
          present,
          absent: Math.max(0, activeCount - present - onLeave),
          onLeave,
        };
      });
      setData(points);
    })();
  }, [range]);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Attendance Overview</CardTitle>
          <p className="text-xs text-muted-foreground">Present employees over time</p>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                range === r.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {data ? <AttendanceTrendChart data={data} /> : <Skeleton className="h-[220px] w-full" />}
      </CardContent>
    </Card>
  );
}
