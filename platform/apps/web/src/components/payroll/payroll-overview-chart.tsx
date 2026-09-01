"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { currency } from "@/lib/format";
import type { Payroll } from "@/lib/api/payroll";

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

interface ChartPoint {
  month: string;
  label: string;
  gross: number;
  net: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-foreground">{monthLabel(point.month)}</p>
      <p className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Gross{" "}
        <span className="font-medium text-foreground">{currency(point.gross)}</span>
      </p>
      <p className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-foreground" /> Net{" "}
        <span className="font-medium text-foreground">{currency(point.net)}</span>
      </p>
    </div>
  );
}

// All-time payroll records grouped by month client-side — cheap at HR scale and
// avoids one API call per month on the range toggle.
export function PayrollOverviewChart({ allRecords }: { allRecords: Payroll[] }) {
  const [range, setRange] = useState<"6" | "12">("6");

  const data = useMemo<ChartPoint[]>(() => {
    const byMonth = new Map<string, { gross: number; net: number }>();
    for (const r of allRecords) {
      const entry = byMonth.get(r.month) ?? { gross: 0, net: 0 };
      entry.gross += Number(r.grossSalary);
      entry.net += Number(r.netSalary);
      byMonth.set(r.month, entry);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-Number(range))
      .map(([month, v]) => ({ month, label: monthLabel(month), ...v }));
  }, [allRecords, range]);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Payroll Overview</CardTitle>
        <Select value={range} onValueChange={(v) => setRange((v as "6" | "12") ?? "6")}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue>{range === "6" ? "6 Months" : "12 Months"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6 Months</SelectItem>
            <SelectItem value="12">12 Months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            No payroll history yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260} debounce={50}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={36}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="gross" name="Gross" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="net" name="Net" stroke="var(--color-foreground)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Gross payroll
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" /> Net payroll
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
