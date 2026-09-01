"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listEmployees } from "@/lib/api/employees";
import { humanize } from "@/lib/format";

interface DeptPoint {
  department: string;
  count: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: DeptPoint }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground">{point.department}</p>
      <p className="text-muted-foreground">{point.count} employees</p>
    </div>
  );
}

// Real headcount per department, derived from live employee records — never a
// hardcoded department list, so a department with zero employees simply doesn't
// appear rather than showing a fabricated bar.
export function DepartmentOverviewChart() {
  const [data, setData] = useState<DeptPoint[] | null>(null);

  useEffect(() => {
    listEmployees().then((employees) => {
      const active = employees.filter((e) => e.accountStatus === "Active");
      const byDept = new Map<string, number>();
      for (const emp of active) {
        const dept = emp.department ? humanize(emp.department) : "Unassigned";
        byDept.set(dept, (byDept.get(dept) ?? 0) + 1);
      }
      setData(
        Array.from(byDept.entries())
          .map(([department, count]) => ({ department, count }))
          .sort((a, b) => b.count - a.count)
      );
    });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Employees by Department</CardTitle>
      </CardHeader>
      <CardContent>
        {data === null ? (
          <Skeleton className="h-[240px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            No employees yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)} debounce={50}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <YAxis
                type="category"
                dataKey="department"
                width={140}
                tick={{ fontSize: 12, fill: "var(--color-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)" }} />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
