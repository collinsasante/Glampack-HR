"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MaskedCurrency } from "@/components/masked-currency";
import { listAttendance } from "@/lib/api/attendance";
import { hasPermission, listEmployees } from "@/lib/api/employees";
import { listLeaveRequests } from "@/lib/api/leave-requests";
import { listMedicalClaims } from "@/lib/api/medical-claims";
import { listPayroll } from "@/lib/api/payroll";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

function monthStr(offset = 0) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + offset);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dateStr(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

interface Stat {
  label: string;
  value: ReactNode;
  trend?: { direction: "up" | "down"; label: string };
  footnote: string;
  href: string;
}

// Every number and trend here is computed from real API responses — headcount,
// today-vs-yesterday attendance, pending approvals, and month-over-month payroll —
// never a placeholder. A metric with no real historical baseline gets no trend badge.
export function AdminStatCards() {
  const { employee } = useAuth();
  const [stats, setStats] = useState<Stat[] | null>(null);

  useEffect(() => {
    if (!employee) return;
    const canViewClaims = hasPermission(employee, "medical_claims.view_all");
    const canViewPayroll = hasPermission(employee, "payroll.view_all");

    (async () => {
      const [employees, presentToday, presentYesterday, pendingLeave, pendingClaims, thisMonthPayroll, lastMonthPayroll] =
        await Promise.all([
          listEmployees(),
          listAttendance({ from: dateStr(0), to: dateStr(0) }),
          listAttendance({ from: dateStr(-1), to: dateStr(-1) }),
          listLeaveRequests({ status: "Pending" }),
          canViewClaims ? listMedicalClaims({ status: "Pending" }) : Promise.resolve([]),
          canViewPayroll ? listPayroll({ month: monthStr(0) }) : Promise.resolve([]),
          canViewPayroll ? listPayroll({ month: monthStr(-1) }) : Promise.resolve([]),
        ]);

      const active = employees.filter((e) => e.accountStatus === "Active");
      const newHires = active.filter((e) => e.joiningDate && e.joiningDate.slice(0, 7) === monthStr(0)).length;

      const presentTodayCount = new Set(presentToday.filter((r) => r.checkInTime).map((r) => r.employeeId)).size;
      const presentYesterdayCount = new Set(
        presentYesterday.filter((r) => r.checkInTime).map((r) => r.employeeId)
      ).size;
      const presentDelta = presentTodayCount - presentYesterdayCount;

      const thisMonthNet = thisMonthPayroll.reduce((sum, p) => sum + Number(p.netSalary), 0);
      const lastMonthNet = lastMonthPayroll.reduce((sum, p) => sum + Number(p.netSalary), 0);
      const payrollDelta = lastMonthNet > 0 ? ((thisMonthNet - lastMonthNet) / lastMonthNet) * 100 : null;

      setStats([
        {
          label: "Total Employees",
          value: String(active.length),
          trend: newHires > 0 ? { direction: "up", label: `+${newHires} new` } : undefined,
          footnote: newHires > 0 ? `${newHires} joined this month` : "Organization headcount",
          href: "/employees",
        },
        {
          label: "Present Today",
          value: String(presentTodayCount),
          trend:
            presentDelta !== 0
              ? { direction: presentDelta > 0 ? "up" : "down", label: `${presentDelta > 0 ? "+" : ""}${presentDelta}` }
              : undefined,
          footnote: "vs. yesterday",
          href: "/attendance",
        },
        {
          label: "Pending Approvals",
          value: String(pendingLeave.length + pendingClaims.length),
          footnote: "Leave requests & medical claims",
          href: "/admin-dashboard",
        },
        {
          label: "This Month's Payroll",
          value: canViewPayroll ? <MaskedCurrency amount={thisMonthNet} /> : "—",
          trend:
            canViewPayroll && payrollDelta !== null
              ? { direction: payrollDelta >= 0 ? "up" : "down", label: `${payrollDelta >= 0 ? "+" : ""}${payrollDelta.toFixed(1)}%` }
              : undefined,
          footnote: canViewPayroll ? "Net payroll, this month" : "Visible to Admin/HR only",
          href: "/payroll",
        },
      ]);
    })();
  }, [employee]);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[124px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <Link key={s.label} href={s.href} className="block transition-transform hover:-translate-y-0.5">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            {s.trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs font-medium",
                  s.trend.direction === "up"
                    ? "border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-400"
                    : "border-red-200 text-red-700 dark:border-red-500/30 dark:text-red-400"
                )}
              >
                {s.trend.direction === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {s.trend.label}
              </span>
            )}
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold text-foreground">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.footnote}</p>
          </CardContent>
        </Card>
        </Link>
      ))}
    </div>
  );
}
