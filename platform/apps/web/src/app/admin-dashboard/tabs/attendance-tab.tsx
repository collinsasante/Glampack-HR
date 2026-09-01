"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listAttendance, type AttendanceRecord } from "@/lib/api/attendance";
import { listEmployees, type Employee } from "@/lib/api/employees";
import { humanize } from "@/lib/format";

export function AttendanceTab() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const [attendance, employeeList] = await Promise.all([
      listAttendance(employeeFilter !== "all" ? { employeeId: employeeFilter } : {}),
      listEmployees(),
    ]);
    setRecords(attendance);
    setEmployees(employeeList);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeFilter]);

  const employeeName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? id;

  return (
    <Card>
      <CardHeader>
        <Select value={employeeFilter} onValueChange={(v) => setEmployeeFilter(v ?? "all")}>
          <SelectTrigger className="w-56">
            <SelectValue>
              {employeeFilter === "all" ? "All employees" : employees.find((e) => e.id === employeeFilter)?.fullName}
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
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <div className="space-y-3 px-6 pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <p className="px-6 text-sm text-muted-foreground">No attendance records found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{employeeName(r.employeeId)}</TableCell>
                  <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                  <TableCell>{humanize(r.shift)}</TableCell>
                  <TableCell>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "-"}</TableCell>
                  <TableCell>{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
