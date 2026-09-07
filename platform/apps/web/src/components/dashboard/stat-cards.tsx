"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MaskedCurrency } from "@/components/masked-currency";
import { listAttendance } from "@/lib/api/attendance";
import { listLeaveRequests } from "@/lib/api/leave-requests";
import { listPayroll } from "@/lib/api/payroll";
import type { Employee } from "@/lib/api/employees";

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface Stat {
  label: string;
  value: ReactNode;
  footnote: string;
  href: string;
}

// Every figure here is computed from the employee's own real records — weekday
// attendance so far this month, actual leave usage/remaining, real pending
// requests, and the most recent real payslip. No placeholder numbers.
export function EmployeeStatCards({ employee }: { employee: Employee }) {
  const [stats, setStats] = useState<Stat[] | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

      const [monthAttendance, yearApprovedLeave, pendingLeave, payroll] = await Promise.all([
        listAttendance({
          employeeId: employee.id,
          from: firstOfMonth.toISOString().slice(0, 10),
          to: now.toISOString().slice(0, 10),
        }),
        listLeaveRequests({ employeeId: employee.id, status: "Approved" }),
        listLeaveRequests({ employeeId: employee.id, status: "Pending" }),
        listPayroll({ employeeId: employee.id }),
      ]);

      let weekdaysElapsed = 0;
      for (let d = new Date(firstOfMonth); d <= now; d.setUTCDate(d.getUTCDate() + 1)) {
        const day = d.getUTCDay();
        if (day !== 0 && day !== 6) weekdaysElapsed += 1;
      }
      const presentDays = monthAttendance.filter((r) => r.checkInTime).length;
      const attendanceRate = weekdaysElapsed > 0 ? Math.round((presentDays / weekdaysElapsed) * 100) : 0;

      const usedThisYear = yearApprovedLeave
        .filter((lr) => new Date(lr.startDate) >= yearStart)
        .reduce((sum, lr) => sum + lr.numberOfDays, 0);

      const latestPayslip = [...payroll].sort((a, b) => (a.month < b.month ? 1 : -1))[0];

      setStats([
        {
          label: "Attendance",
          value: `${presentDays} / ${weekdaysElapsed}`,
          footnote: weekdaysElapsed > 0 ? `${attendanceRate}% attendance rate this month` : "No working days yet this month",
          href: "/attendance",
        },
        {
          label: "Leave Balance",
          value: `${employee.annualLeaveBalance} days`,
          footnote: `${usedThisYear} day${usedThisYear === 1 ? "" : "s"} used this year`,
          href: "/leave",
        },
        {
          label: "Pending Requests",
          value: String(pendingLeave.length),
          footnote: pendingLeave.length > 0 ? "Awaiting approval" : "Nothing pending",
          href: "/leave",
        },
        {
          label: "Latest Salary",
          value: latestPayslip ? <MaskedCurrency amount={Number(latestPayslip.netSalary)} /> : "—",
          footnote: latestPayslip ? monthLabel(latestPayslip.month) : "No payslips yet",
          href: "/payroll",
        },
      ]);
    })();
  }, [employee]);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[108px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <Link key={s.label} href={s.href}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="pb-1">
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-bold text-foreground">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.footnote}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
