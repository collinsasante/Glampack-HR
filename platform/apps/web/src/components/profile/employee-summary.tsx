"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { listAttendance } from "@/lib/api/attendance";
import { listPayroll } from "@/lib/api/payroll";
import type { Employee } from "@/lib/api/employees";

function yearsOfService(joiningDate: string | null) {
  if (!joiningDate) return "—";
  const years = (Date.now() - new Date(joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return `${years.toFixed(1)} yrs`;
}

// Every figure is real: attendance is computed the same way the dashboard does
// (weekday check-ins this month), leave balance comes straight off the
// employee record, and payroll status reflects the most recent real payslip.
export function EmployeeSummary({ employee }: { employee: Employee }) {
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [payrollStatus, setPayrollStatus] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    listAttendance({
      employeeId: employee.id,
      from: firstOfMonth.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    }).then((records) => {
      let weekdaysElapsed = 0;
      for (let d = new Date(firstOfMonth); d <= now; d.setUTCDate(d.getUTCDate() + 1)) {
        const day = d.getUTCDay();
        if (day !== 0 && day !== 6) weekdaysElapsed += 1;
      }
      const presentDays = records.filter((r) => r.checkInTime).length;
      setAttendanceRate(weekdaysElapsed > 0 ? Math.round((presentDays / weekdaysElapsed) * 100) : 0);
    });

    listPayroll({ employeeId: employee.id }).then((records) => {
      const latest = [...records].sort((a, b) => (a.month < b.month ? 1 : -1))[0];
      setPayrollStatus(latest?.status ?? null);
    });
  }, [employee.id]);

  const cards = [
    { label: "Years of Service", value: yearsOfService(employee.joiningDate), href: null },
    { label: "Leave Balance", value: `${employee.annualLeaveBalance} days`, href: "/leave" },
    { label: "Attendance (this month)", value: attendanceRate !== null ? `${attendanceRate}%` : "—", href: "/attendance" },
    { label: "Payroll Status", value: payrollStatus ?? "No payroll yet", href: "/payroll" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => {
        const content = (
          <Card className={c.href ? "cursor-pointer transition-shadow hover:shadow-md" : undefined}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="font-heading mt-1 text-2xl font-bold text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        );
        return c.href ? (
          <Link key={c.label} href={c.href}>
            {content}
          </Link>
        ) : (
          <div key={c.label}>{content}</div>
        );
      })}
    </div>
  );
}
