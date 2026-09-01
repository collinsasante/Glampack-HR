"use client";

import { AlertTriangle, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { AttendanceDetailDrawer, type AttendanceMonthSummary } from "@/components/attendance/attendance-detail-drawer";
import { AttendanceTrendChart, type TrendPoint } from "@/components/attendance/attendance-trend-chart";
import { ExportAttendanceModal } from "@/components/attendance/export-attendance-modal";
import { TodayAttendanceCard } from "@/components/attendance/today-attendance-card";
import { DepartmentBreakdownChart, type DepartmentPoint } from "@/components/attendance/department-breakdown-chart";
import { PersonalAttendanceStats } from "@/components/attendance/personal-stats";
import { WeeklySummary } from "@/components/attendance/weekly-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAttendance, type AttendanceRecord } from "@/lib/api/attendance";
import { listEmployees, isStaffRole, type Employee } from "@/lib/api/employees";
import { listLeaveRequests } from "@/lib/api/leave-requests";
import { attendanceDuration, attendanceDurationMinutes, attendanceStatus, attendanceStatusVariant } from "@/lib/attendance-status";
import { useAuth } from "@/lib/auth-context";
import { DATE_RANGE_PRESETS, lastNDaysUtc, resolveDateRange, todayStr, type DateRangePreset } from "@/lib/dates";
import { humanize } from "@/lib/format";
import type { Department } from "@glampack/shared";

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
      <p className="font-medium text-foreground">Unable to load attendance</p>
      <p className="text-sm text-muted-foreground">We couldn&apos;t retrieve attendance records right now.</p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  );
}

function DateRangeSelect({ value, onChange }: { value: DateRangePreset; onChange: (v: DateRangePreset) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange((v as DateRangePreset) ?? "today")}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue>{DATE_RANGE_PRESETS.find((p) => p.value === value)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {DATE_RANGE_PRESETS.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StaffAttendanceView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [onLeaveToday, setOnLeaveToday] = useState(0);
  const [date, setDate] = useState(todayStr());
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [historyRange, setHistoryRange] = useState<DateRangePreset>("today");
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(false);
    try {
      const [employeeList, dayRecords, approvedLeave] = await Promise.all([
        listEmployees(),
        listAttendance({ from: date, to: date }),
        listLeaveRequests({ status: "Approved" }),
      ]);
      setEmployees(employeeList);
      setRecords(dayRecords);
      const t = new Date(date);
      const onLeave = new Set(
        approvedLeave
          .filter((lr) => new Date(lr.startDate) <= t && t <= new Date(lr.endDate))
          .map((lr) => lr.employeeId)
      );
      setOnLeaveToday(onLeave.size);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function refreshHistory() {
    setHistoryLoading(true);
    try {
      const { from, to } = resolveDateRange(historyRange);
      setHistoryRecords(await listAttendance({ from, to }));
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyRange]);

  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    if (employees.length === 0) return;
    (async () => {
      setTrendLoading(true);
      try {
        const days = lastNDaysUtc(14);
        const [rangeRecords, approvedLeave] = await Promise.all([
          listAttendance({
            from: days[0]!.toISOString().slice(0, 10),
            to: days[days.length - 1]!.toISOString().slice(0, 10),
          }),
          listLeaveRequests({ status: "Approved" }),
        ]);
        const activeCount = employees.filter((e) => e.accountStatus === "Active").length;
        const points: TrendPoint[] = [];
        for (const d of days) {
          const dStr = d.toISOString().slice(0, 10);
          const dayRecords = rangeRecords.filter((r) => r.date.slice(0, 10) === dStr);
          const present = new Set(dayRecords.filter((r) => r.checkInTime).map((r) => r.employeeId)).size;
          const onLeave = new Set(
            approvedLeave
              .filter((lr) => new Date(lr.startDate) <= d && d <= new Date(lr.endDate))
              .map((lr) => lr.employeeId)
          ).size;
          points.push({
            date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }),
            present,
            absent: Math.max(0, activeCount - present - onLeave),
            onLeave,
          });
        }
        setTrend(points);
      } finally {
        setTrendLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.length]);

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const activeCount = employees.filter((e) => e.accountStatus === "Active").length;
  const presentCount = new Set(records.filter((r) => r.checkInTime).map((r) => r.employeeId)).size;
  const lateCount = records.filter((r) => attendanceStatus(r) === "Late").length;
  const absentCount = Math.max(0, activeCount - presentCount - onLeaveToday);

  const filteredHistory = historyRecords.filter((r) => {
    if (employeeFilter !== "all" && r.employeeId !== employeeFilter) return false;
    if (departmentFilter !== "all" && employeeById.get(r.employeeId)?.department !== departmentFilter) return false;
    return true;
  });

  const departmentBreakdown = useMemo<DepartmentPoint[]>(() => {
    const byDept = new Map<string, DepartmentPoint>();
    for (const emp of employees) {
      if (emp.accountStatus !== "Active") continue;
      const dept = emp.department ? humanize(emp.department) : "Unassigned";
      const entry = byDept.get(dept) ?? { department: dept, present: 0, total: 0 };
      entry.total += 1;
      byDept.set(dept, entry);
    }
    const presentIds = new Set(records.filter((r) => r.checkInTime).map((r) => r.employeeId));
    for (const emp of employees) {
      if (!presentIds.has(emp.id)) continue;
      const dept = emp.department ? humanize(emp.department) : "Unassigned";
      const entry = byDept.get(dept);
      if (entry) entry.present += 1;
    }
    return Array.from(byDept.values())
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [employees, records]);

  function monthSummaryFor(employeeId: string): AttendanceMonthSummary {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const own = historyRecords.filter((r) => r.employeeId === employeeId && r.date.slice(0, 7) === monthStr);
    return {
      present: own.filter((r) => r.checkInTime).length,
      late: own.filter((r) => attendanceStatus(r) === "Late").length,
      totalMinutes: own.reduce((sum, r) => sum + attendanceDurationMinutes(r), 0),
    };
  }

  if (error) return <ErrorState onRetry={refresh} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Organization-wide snapshot for the selected date.</p>
        <div className="flex items-center gap-2">
          <Label htmlFor="date" className="text-xs text-muted-foreground">
            Stats for
          </Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-40" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total Employees" value={activeCount} />
        <StatCard label="Present Today" value={presentCount} />
        <StatCard label="Absent Today" value={absentCount} />
        <StatCard label="On Leave" value={onLeaveToday} />
        <StatCard label="Late" value={lateCount} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Present employees, last 14 days</p>
          </CardHeader>
          <CardContent>
            {trendLoading ? <Skeleton className="h-[220px] w-full" /> : <AttendanceTrendChart data={trend} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Department</CardTitle>
            <p className="text-xs text-muted-foreground">Present on {new Date(date).toLocaleDateString()}</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : departmentBreakdown.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No active employees to show.
              </div>
            ) : (
              <DepartmentBreakdownChart data={departmentBreakdown} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <p className="font-heading text-base font-semibold text-foreground">Attendance History</p>
            <p className="text-xs text-muted-foreground">{filteredHistory.length} records</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeSelect value={historyRange} onChange={setHistoryRange} />
            <Select value={employeeFilter} onValueChange={(v) => setEmployeeFilter(v ?? "all")}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue>
                  {employeeFilter === "all" ? "All employees" : employeeById.get(employeeFilter)?.fullName}
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
          {historyLoading ? (
            <div className="space-y-3 px-6 pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No attendance records for this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((r) => {
                  const emp = employeeById.get(r.employeeId);
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedRecord(r);
                        setDrawerOpen(true);
                      }}
                    >
                      <TableCell className="font-medium text-foreground">{emp?.fullName ?? r.employeeId}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {emp?.department ? humanize(emp.department) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(r.date).toLocaleDateString()}</TableCell>
                      <TableCell>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "—"}</TableCell>
                      <TableCell>{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{attendanceDuration(r) ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={attendanceStatusVariant(attendanceStatus(r))}>{attendanceStatus(r)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[r.checkInCity, r.checkInRegion].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AttendanceDetailDrawer
        record={selectedRecord}
        employee={employeeById.get(selectedRecord?.employeeId ?? "")}
        monthSummary={selectedRecord ? monthSummaryFor(selectedRecord.employeeId) : undefined}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <ExportAttendanceModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        label={DATE_RANGE_PRESETS.find((p) => p.value === historyRange)?.label ?? historyRange}
        records={filteredHistory}
        employees={employees}
      />
    </div>
  );
}

function OwnAttendanceHistory({ employeeId, employee }: { employeeId: string; employee: Employee }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [historyRange, setHistoryRange] = useState<DateRangePreset>("month");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(false);
    try {
      const [attendance, approvedLeave] = await Promise.all([
        listAttendance({ employeeId }),
        listLeaveRequests({ employeeId, status: "Approved" }),
      ]);
      setRecords(attendance);

      const points: TrendPoint[] = [];
      for (const d of lastNDaysUtc(14)) {
        const dStr = d.toISOString().slice(0, 10);
        const present = attendance.some((r) => r.date.slice(0, 10) === dStr && r.checkInTime) ? 1 : 0;
        const onLeave = approvedLeave.some((lr) => new Date(lr.startDate) <= d && d <= new Date(lr.endDate)) ? 1 : 0;
        points.push({
          date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }),
          present,
          onLeave,
          absent: !present && !onLeave ? 1 : 0,
        });
      }
      setTrend(points);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const monthRecords = useMemo(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return records.filter((r) => r.date.slice(0, 7) === monthStr);
  }, [records]);

  const filteredHistory = useMemo(() => {
    const { from, to } = resolveDateRange(historyRange);
    return records.filter((r) => {
      const d = r.date.slice(0, 10);
      return d >= from && d <= to;
    });
  }, [records, historyRange]);

  if (error) return <ErrorState onRetry={refresh} />;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-full" />
          ))}
        </div>
      ) : (
        <PersonalAttendanceStats monthRecords={monthRecords} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Overview</CardTitle>
              <p className="text-xs text-muted-foreground">Your check-ins over the last 14 days</p>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[220px] w-full" /> : <AttendanceTrendChart data={trend} />}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          {loading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <WeeklySummary
              records={records}
              onSelect={(r) => {
                setSelectedRecord(r);
                setDrawerOpen(true);
              }}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Attendance History</CardTitle>
            <p className="text-xs text-muted-foreground">Your attendance records</p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangeSelect value={historyRange} onChange={setHistoryRange} />
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
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No attendance records</p>
              <p className="text-sm text-muted-foreground">Your attendance history will appear here after you check in.</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No attendance records for this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedRecord(r);
                      setDrawerOpen(true);
                    }}
                  >
                    <TableCell className="font-medium text-foreground">
                      {new Date(r.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{humanize(r.shift)}</TableCell>
                    <TableCell>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell>{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{attendanceDuration(r) ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={attendanceStatusVariant(attendanceStatus(r))}>{attendanceStatus(r)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[r.checkInCity, r.checkInRegion].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AttendanceDetailDrawer record={selectedRecord} open={drawerOpen} onOpenChange={setDrawerOpen} />

      <ExportAttendanceModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        label={DATE_RANGE_PRESETS.find((p) => p.value === historyRange)?.label ?? historyRange}
        records={filteredHistory}
        employees={[employee]}
      />
    </div>
  );
}

function AttendanceContent() {
  const { employee } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!employee) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          {isStaffRole(employee.role)
            ? "Organization-wide attendance and check-in/out."
            : "Track your attendance, working hours, and check-in activity."}
        </p>
      </div>

      <TodayAttendanceCard onChange={() => setRefreshKey((k) => k + 1)} />

      {isStaffRole(employee.role) ? (
        <StaffAttendanceView key={refreshKey} />
      ) : (
        <OwnAttendanceHistory key={refreshKey} employeeId={employee.id} employee={employee} />
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <RequireAuth>
      <AppShell>
        <AttendanceContent />
      </AppShell>
    </RequireAuth>
  );
}
