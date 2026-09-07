"use client";

import { ArrowDownRight, ArrowUpRight, Banknote, Receipt, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MaskedCurrency } from "@/components/masked-currency";
import { cn } from "@/lib/utils";
import type { Payroll } from "@/lib/api/payroll";

function sum(records: Payroll[], key: keyof Payroll) {
  return records.reduce((total, r) => total + Number(r[key]), 0);
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function PayrollStatCards({
  month,
  currentRecords,
  previousRecords,
}: {
  month: string;
  currentRecords: Payroll[];
  previousRecords: Payroll[];
}) {
  const totalGross = sum(currentRecords, "grossSalary");
  const totalNet = sum(currentRecords, "netSalary");
  const totalDeductions = sum(currentRecords, "totalDeductions");
  const processedCount = currentRecords.filter((r) => r.status === "Processed" || r.status === "Paid").length;

  const prevGross = sum(previousRecords, "grossSalary");
  // No fabricated trend when there's nothing real to compare against.
  const grossTrendPct = prevGross > 0 ? ((totalGross - prevGross) / prevGross) * 100 : null;
  const deductionsPctOfGross = totalGross > 0 ? (totalDeductions / totalGross) * 100 : 0;

  const cards = [
    {
      label: "Total Payroll",
      icon: Wallet,
      value: <MaskedCurrency amount={totalNet} />,
      footnote: monthLabel(month),
    },
    {
      label: "Gross Payroll",
      icon: TrendingUp,
      value: <MaskedCurrency amount={totalGross} />,
      trend:
        grossTrendPct !== null
          ? { direction: grossTrendPct >= 0 ? ("up" as const) : ("down" as const), pct: grossTrendPct }
          : null,
      footnote: grossTrendPct === null ? "No prior month to compare" : null,
    },
    {
      label: "Total Deductions",
      icon: Receipt,
      value: <MaskedCurrency amount={totalDeductions} />,
      footnote: `${deductionsPctOfGross.toFixed(1)}% of gross`,
    },
    {
      label: "Net Payroll",
      icon: Banknote,
      value: <MaskedCurrency amount={totalNet} />,
      footnote: `${processedCount} employee${processedCount === 1 ? "" : "s"} processed`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{c.label}</p>
            <c.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-foreground">{c.value}</p>
            <div className="mt-1 flex items-center gap-1.5">
              {c.trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    c.trend.direction === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )}
                >
                  {c.trend.direction === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(c.trend.pct).toFixed(1)}%
                </span>
              )}
              <p className="text-xs text-muted-foreground">
                {c.trend ? "from last month" : c.footnote}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
