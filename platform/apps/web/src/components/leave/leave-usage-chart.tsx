"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["var(--color-primary)", "var(--color-muted)"];

export function LeaveUsageChart({ used, remaining }: { used: number; remaining: number }) {
  const data = [
    { name: "Used", value: used },
    { name: "Remaining", value: remaining },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div className="relative [&_*]:outline-none">
      <ResponsiveContainer width="100%" height={180} debounce={50}>
        <PieChart accessibilityLayer={false}>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={75} paddingAngle={2}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value} day${Number(value) === 1 ? "" : "s"}`, String(name)]}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs text-muted-foreground">Remaining</p>
        <p className="text-lg font-bold text-foreground">{remaining}</p>
      </div>
    </div>
  );
}
