"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AttendanceTrendChart, type TrendPoint } from "@/components/attendance/attendance-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listAttendance } from "@/lib/api/attendance";
import { listLeaveRequests } from "@/lib/api/leave-requests";
import { lastNDaysUtc } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/api/employees";

function isWeekday(d: Date) {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

async function loadWindow(employeeId: string, days: Date[]) {
  const [records, approvedLeave] = await Promise.all([
    listAttendance({
      employeeId,
      from: days[0]!.toISOString().slice(0, 10),
      to: days[days.length - 1]!.toISOString().slice(0, 10),
    }),
    listLeaveRequests({ employeeId, status: "Approved" }),
  ]);

  let present = 0;
  let late = 0;
  let onLeave = 0;
  let weekdays = 0;
  const points: TrendPoint[] = [];

  for (const d of days) {
    const dStr = d.toISOString().slice(0, 10);
    const record = records.find((r) => r.date.slice(0, 10) === dStr);
    const wasOnLeave = approvedLeave.some((lr) => new Date(lr.startDate) <= d && d <= new Date(lr.endDate));
    const wasPresent = Boolean(record?.checkInTime);
    if (isWeekday(d)) weekdays += 1;
    if (wasPresent) {
      present += 1;
      if (record?.lateReason) late += 1;
    }
    if (wasOnLeave) onLeave += 1;
    points.push({
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }),
      present: wasPresent ? 1 : 0,
      onLeave: wasOnLeave ? 1 : 0,
      absent: !wasPresent && !wasOnLeave && isWeekday(d) ? 1 : 0,
    });
  }

  const absent = points.reduce((sum, p) => sum + p.absent, 0);
  const rate = weekdays > 0 ? Math.round((present / weekdays) * 100) : 0;
  return { points, present, late, absent, onLeave, rate };
}

export function AttendancePerformance({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [range, setRange] = useState<"7" | "30">("7");
  const [data, setData] = useState<Awaited<ReturnType<typeof loadWindow>> | null>(null);
  const [prevRate, setPrevRate] = useState<number | null>(null);

  useEffect(() => {
    setData(null);
    const n = Number(range);
    const current = lastNDaysUtc(n);
    const previous = lastNDaysUtc(n * 2).slice(0, n);
    Promise.all([loadWindow(employee.id, current), loadWindow(employee.id, previous)]).then(([curr, prev]) => {
      setData(curr);
      setPrevRate(prev.rate > 0 ? prev.rate : null);
    });
  }, [employee, range]);

  const trendDelta = data && prevRate !== null ? data.rate - prevRate : null;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => router.push("/attendance")}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && router.push("/attendance")}
      className="cursor-pointer transition-shadow hover:shadow-md"
    >
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Attendance Overview</CardTitle>
          <p className="text-xs text-muted-foreground">Your attendance performance</p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Select value={range} onValueChange={(v) => setRange((v as "7" | "30") ?? "7")}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue>{range === "7" ? "Week" : "Month"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Week</SelectItem>
              <SelectItem value="30">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <Skeleton className="h-[220px] w-full" />
        ) : (
          <>
            <AttendanceTrendChart data={data.points} />
            <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted-foreground">Attendance Rate</p>
                <div className="flex items-center gap-1.5">
                  <p className="font-heading text-xl font-bold text-foreground">{data.rate}%</p>
                  {trendDelta !== null && trendDelta !== 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-xs font-medium",
                        trendDelta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {trendDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(trendDelta)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Present</p>
                  <p className="font-medium text-foreground tabular-nums">{data.present}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Late</p>
                  <p className="font-medium text-foreground tabular-nums">{data.late}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Absent</p>
                  <p className="font-medium text-foreground tabular-nums">{data.absent}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Leave</p>
                  <p className="font-medium text-foreground tabular-nums">{data.onLeave}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
