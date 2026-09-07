"use client";

import { AlertTriangle, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { LeaveBalanceCard } from "@/components/dashboard/leave-balance-card";
import { LeaveCalendar } from "@/components/leave/leave-calendar";
import { LeaveDetailDrawer } from "@/components/leave/leave-detail-drawer";
import { LeaveHistoryTable } from "@/components/leave/leave-history-table";
import { LeaveMonthlyChart, type MonthlyLeavePoint } from "@/components/leave/leave-monthly-chart";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { LeaveUsageChart } from "@/components/leave/leave-usage-chart";
import { ExportLeaveModal } from "@/components/leave/export-leave-modal";
import { OnLeaveTodayCard } from "@/components/leave/on-leave-today-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/apiClient";
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  listLeaveRequests,
  rejectLeaveRequest,
  type LeaveRequest,
} from "@/lib/api/leave-requests";
import { hasPermission, isStaffRole, listEmployees, type Employee } from "@/lib/api/employees";
import { useAuth } from "@/lib/auth-context";
import { humanize } from "@/lib/format";
import type { Department } from "@glampack/shared";

const ANNUAL_ENTITLEMENT = 20;

const DEPARTMENTS: Department[] = [
  "Administration",
  "Management",
  "Production",
  "Operations",
  "CustomerService",
  "Logistics",
  "WarehousingAndFulfilment",
  "Finance",
  "Sales",
  "Marketing",
  "Engineering",
  "CreativeDesign",
  "Pakkmax",
];

const STATUS_OPTIONS = ["all", "Pending", "Approved", "Rejected", "Cancelled"];

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium text-foreground">Unable to load leave requests</p>
      <p className="text-sm text-muted-foreground">We couldn&apos;t retrieve leave data right now.</p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  );
}

function monthlyBreakdown(requests: LeaveRequest[]): MonthlyLeavePoint[] {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
    return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, d };
  });
  return months.map(({ key, d }) => {
    const inMonth = requests.filter((r) => r.createdAt.slice(0, 7) === key);
    return {
      month: d.toLocaleDateString(undefined, { month: "short", year: "2-digit", timeZone: "UTC" }),
      approved: inMonth.filter((r) => r.status === "Approved").length,
      pending: inMonth.filter((r) => r.status === "Pending").length,
      rejected: inMonth.filter((r) => r.status === "Rejected" || r.status === "Cancelled").length,
    };
  });
}

function OwnLeaveView({ employee, onEmployeeRefresh }: { employee: Employee; onEmployeeRefresh: () => void }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(false);
    try {
      setRequests(await listLeaveRequests({ employeeId: employee.id }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  const thisYear = new Date().getUTCFullYear();
  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const approvedYtd = requests.filter(
    (r) => r.status === "Approved" && new Date(r.startDate).getUTCFullYear() === thisYear
  ).length;
  const closedYtd = requests.filter(
    (r) =>
      (r.status === "Rejected" || r.status === "Cancelled") &&
      new Date(r.createdAt).getUTCFullYear() === thisYear
  ).length;
  const daysUsedYtd = requests
    .filter((r) => r.status === "Approved" && new Date(r.startDate).getUTCFullYear() === thisYear)
    .reduce((sum, r) => sum + r.numberOfDays, 0);

  const remaining = employee.annualLeaveBalance;
  const used = Math.max(0, ANNUAL_ENTITLEMENT - remaining);

  const filtered = requests.filter((r) => statusFilter === "all" || r.status === statusFilter);

  async function handleCancel(id: string, reason: string) {
    await cancelLeaveRequest(id, reason);
    toast.success("Leave request cancelled");
    setDrawerOpen(false);
    await refresh();
  }

  if (error) return <ErrorState onRetry={refresh} />;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[84px] w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Pending Requests" value={pendingCount} />
          <StatCard label="Approved (YTD)" value={approvedYtd} />
          <StatCard label="Days Used (YTD)" value={daysUsedYtd} />
          <StatCard label="Closed / Rejected (YTD)" value={closedYtd} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeaveBalanceCard employee={employee} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave Usage</CardTitle>
            <p className="text-xs text-muted-foreground">{used} of {ANNUAL_ENTITLEMENT} days used</p>
          </CardHeader>
          <CardContent>
            <LeaveUsageChart used={used} remaining={remaining} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LeaveRequestForm
          onSubmitted={() => {
            refresh();
            onEmployeeRefresh();
          }}
        />
        <LeaveCalendar requests={requests} title="My Leave Calendar" />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Leave History</CardTitle>
            <p className="text-xs text-muted-foreground">{filtered.length} request{filtered.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue>{statusFilter === "all" ? "All statuses" : statusFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="space-y-3 px-6 pb-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No leave requests yet</p>
              <p className="text-sm text-muted-foreground">Submit your first request using the form above.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No requests match this filter.</p>
          ) : (
            <LeaveHistoryTable
              requests={filtered}
              onSelect={(r) => {
                setSelected(r);
                setDrawerOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      <LeaveDetailDrawer
        request={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        cancelScope="self"
        onCancel={handleCancel}
      />

      <ExportLeaveModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        label={`${employee.fullName} — ${statusFilter === "all" ? "All Statuses" : statusFilter}`}
        requests={filtered}
        employees={[employee]}
      />
    </div>
  );
}

function StaffLeaveView({ currentEmployee }: { currentEmployee: Employee }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const canReview = hasPermission(currentEmployee, "leave.approve");

  async function refresh() {
    setLoading(true);
    setError(false);
    try {
      const [emps, reqs] = await Promise.all([listEmployees(), listLeaveRequests()]);
      setEmployees(emps);
      setRequests(reqs);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const employeeById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const today = new Date();
  const onLeaveToday = requests.filter(
    (r) => r.status === "Approved" && new Date(r.startDate) <= today && today <= new Date(r.endDate)
  ).length;
  const monthKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const approvedThisMonth = requests.filter(
    (r) => r.status === "Approved" && r.createdAt.slice(0, 7) === monthKey
  ).length;
  const totalThisMonth = requests.filter((r) => r.createdAt.slice(0, 7) === monthKey).length;

  const filtered = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (employeeFilter !== "all" && r.employeeId !== employeeFilter) return false;
    if (departmentFilter !== "all" && employeeById[r.employeeId]?.department !== departmentFilter) return false;
    return true;
  });

  const pending = filtered.filter((r) => r.status === "Pending");

  async function handleApprove(id: string) {
    try {
      await approveLeaveRequest(id);
      toast.success("Leave request approved");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to approve request");
      throw err;
    }
  }

  async function handleReject(id: string, reason: string) {
    try {
      await rejectLeaveRequest(id, reason);
      toast.success("Leave request rejected");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reject request");
      throw err;
    }
  }

  async function handleCancel(id: string, reason: string) {
    try {
      await cancelLeaveRequest(id, reason);
      toast.success("Leave request cancelled");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to cancel request");
      throw err;
    }
  }

  if (error) return <ErrorState onRetry={refresh} />;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[84px] w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Pending Approvals" value={pendingCount} />
          <StatCard label="On Leave Today" value={onLeaveToday} />
          <StatCard label="Approved This Month" value={approvedThisMonth} />
          <StatCard label="Requests This Month" value={totalThisMonth} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave Requests</CardTitle>
            <p className="text-xs text-muted-foreground">Submitted per month, last 6 months</p>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[220px] w-full" /> : <LeaveMonthlyChart data={monthlyBreakdown(requests)} />}
          </CardContent>
        </Card>
        {loading ? <Skeleton className="h-[220px] w-full" /> : <OnLeaveTodayCard requests={requests} employees={employees} />}
      </div>

      <LeaveCalendar requests={requests} employees={employeeById} title="Team Leave Calendar" />

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Approvals</CardTitle>
            <p className="text-xs text-muted-foreground">
              {pending.length} request{pending.length === 1 ? "" : "s"} awaiting review
            </p>
          </CardHeader>
          <CardContent className="px-0">
            <LeaveHistoryTable
              requests={pending}
              employees={employeeById}
              onSelect={(r) => {
                setSelected(r);
                setDrawerOpen(true);
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">All Leave Requests</CardTitle>
            <p className="text-xs text-muted-foreground">{filtered.length} record{filtered.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue>{statusFilter === "all" ? "All statuses" : statusFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={employeeFilter} onValueChange={(v) => setEmployeeFilter(v ?? "all")}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue>
                  {employeeFilter === "all" ? "All employees" : employeeById[employeeFilter]?.fullName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v ?? "all")}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue>{departmentFilter === "all" ? "All departments" : humanize(departmentFilter)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {humanize(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="space-y-3 px-6 pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No leave requests match these filters.</p>
          ) : (
            <LeaveHistoryTable
              requests={filtered}
              employees={employeeById}
              onSelect={(r) => {
                setSelected(r);
                setDrawerOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      <LeaveDetailDrawer
        request={selected}
        employee={selected ? employeeById[selected.employeeId] : undefined}
        approver={selected?.approvedById ? employeeById[selected.approvedById] : undefined}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        canReview={canReview}
        cancelScope="staff"
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={handleCancel}
      />

      <ExportLeaveModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        label={statusFilter === "all" ? "All Requests" : statusFilter}
        requests={filtered}
        employees={employees}
      />
    </div>
  );
}

function LeaveContent() {
  const { employee, refreshEmployee } = useAuth();

  if (!employee) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Leave Management</h1>
        <p className="text-sm text-muted-foreground">
          {isStaffRole(employee)
            ? "Review requests, track balances, and see who's out across the organization."
            : "Request time off, track your balance, and review your leave history."}
        </p>
      </div>

      {isStaffRole(employee) ? (
        <StaffLeaveView currentEmployee={employee} />
      ) : (
        <OwnLeaveView employee={employee} onEmployeeRefresh={refreshEmployee} />
      )}
    </div>
  );
}

export default function LeavePage() {
  return (
    <RequireAuth>
      <AppShell>
        <LeaveContent />
      </AppShell>
    </RequireAuth>
  );
}
