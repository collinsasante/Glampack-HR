"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface DepartmentPoint {
  department: string;
  present: number;
  total: number;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: DepartmentPoint }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{point.present}</span> of {point.total} present
      </p>
    </div>
  );
}

export function DepartmentBreakdownChart({ data }: { data: DepartmentPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220} debounce={50}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="department"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--color-border)" }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)" }} />
        <Bar dataKey="present" name="Present" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
