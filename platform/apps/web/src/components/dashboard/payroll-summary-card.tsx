"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listPayroll, type Payroll } from "@/lib/api/payroll";
import { currency } from "@/lib/format";
import type { Employee } from "@/lib/api/employees";

export function PayrollSummaryCard({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [latest, setLatest] = useState<Payroll[] | null>(null);

  useEffect(() => {
    listPayroll({ employeeId: employee.id }).then(setLatest);
  }, [employee]);

  const payslip = latest ? [...latest].sort((a, b) => (a.month < b.month ? 1 : -1))[0] : undefined;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => router.push("/payroll")}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && router.push("/payroll")}
      className="cursor-pointer transition-shadow hover:shadow-md"
    >
      <CardHeader>
        <CardTitle className="text-base">Latest Payroll</CardTitle>
        {payslip && <p className="text-xs text-muted-foreground">{payslip.month}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        {latest === null ? (
          <Skeleton className="h-32 w-full" />
        ) : !payslip ? (
          <p className="text-sm text-muted-foreground">No payslips yet.</p>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gross Salary</span>
              <span className="tabular-nums text-foreground">{currency(payslip.grossSalary)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Deductions</span>
              <span className="tabular-nums text-foreground">{currency(payslip.totalDeductions)}</span>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Net Salary</p>
              <p className="font-heading text-2xl font-bold text-foreground">{currency(payslip.netSalary)}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Payment Date{" "}
              <span className="text-foreground">
                {payslip.paymentDate ? new Date(payslip.paymentDate).toLocaleDateString() : "—"}
              </span>
            </p>
            <div onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" className="w-full" size="sm" nativeButton={false} render={<Link href="/payroll" />}>
                View Payslip
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
