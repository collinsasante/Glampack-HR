"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { currency } from "@/lib/format";

const COLORS = ["var(--color-primary)", "var(--color-foreground)", "var(--color-muted-foreground)"];

export function SalaryBreakdownChart({
  basicSalary,
  totalAllowances,
  totalDeductions,
  grossSalary,
}: {
  basicSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
}) {
  const data = [
    { name: "Basic Salary", value: basicSalary },
    { name: "Allowances", value: totalAllowances },
    { name: "Deductions", value: totalDeductions },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">Salary Breakdown</p>
      <div className="relative [&_*]:outline-none">
        <ResponsiveContainer width="100%" height={160} debounce={50}>
          <PieChart accessibilityLayer={false}>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={65} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [currency(Number(value ?? 0)), String(name)]}
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
          <p className="text-xs text-muted-foreground">Gross</p>
          <p className="text-sm font-bold text-foreground">{currency(grossSalary)}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {data.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}
