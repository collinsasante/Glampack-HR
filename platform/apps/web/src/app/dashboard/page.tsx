"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { TodayAttendanceCard } from "@/components/attendance/today-attendance-card";
import { EmployeeStatCards } from "@/components/dashboard/stat-cards";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { AttendancePerformance } from "@/components/dashboard/attendance-performance";
import { PayrollSummaryCard } from "@/components/dashboard/payroll-summary-card";
import { AnnouncementsPreview } from "@/components/dashboard/announcements-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { listAttendance } from "@/lib/api/attendance";
import { listLeaveRequests, type LeaveRequest } from "@/lib/api/leave-requests";
import { humanize } from "@/lib/format";

function statusVariant(status: string): "success" | "warning" | "destructive" {
  if (status === "Approved") return "success";
  if (status === "Rejected" || status === "Cancelled") return "destructive";
  return "warning";
}

function DashboardContent() {
  const router = useRouter();
  const { employee } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [workingNow, setWorkingNow] = useState<boolean | null>(null);

  async function refresh() {
    if (!employee) return;
    const [leave, todayStr] = await Promise.all([
      listLeaveRequests({ employeeId: employee.id }),
      Promise.resolve(new Date().toISOString().slice(0, 10)),
    ]);
    setLeaveRequests(leave.slice(0, 5));
    const attendance = await listAttendance({ employeeId: employee.id, from: todayStr, to: todayStr });
    const today = attendance[0];
    setWorkingNow(Boolean(today?.checkInTime && !today?.checkOutTime));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  if (!employee) return null;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {employee.fullName.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {employee.jobTitle ?? employee.role} · {employee.department && humanize(employee.department)} · {today}
          </p>
        </div>
        {workingNow !== null && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Today&apos;s status</p>
            <Badge variant={workingNow ? "success" : "secondary"} className="mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${workingNow ? "bg-emerald-600" : "bg-muted-foreground"}`} />
              {workingNow ? "Working" : "Not checked in"}
            </Badge>
          </div>
        )}
      </div>

      <EmployeeStatCards employee={employee} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TodayAttendanceCard onChange={refresh} />
        <AnnouncementsPreview />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <AttentionPanel employee={employee} />

        <Card
          role="button"
          tabIndex={0}
          onClick={() => router.push("/leave")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && router.push("/leave")}
          className="cursor-pointer transition-shadow hover:shadow-md"
        >
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {leaveRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leave requests yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {leaveRequests.map((lr) => (
                  <li key={lr.id} className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{lr.leaveType}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(lr.startDate).toLocaleDateString()} – {new Date(lr.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={statusVariant(lr.status)}>{lr.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <PayrollSummaryCard employee={employee} />
      </div>

      <AttendancePerformance employee={employee} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </RequireAuth>
  );
}
