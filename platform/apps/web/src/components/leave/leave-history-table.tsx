"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { leaveStatusVariant } from "@/lib/leave-status";
import type { LeaveRequest } from "@/lib/api/leave-requests";
import type { Employee } from "@/lib/api/employees";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  Vacation: "Vacation",
  Sick: "Sick Leave",
  Study: "Study Leave",
  Other: "Other",
};

export function LeaveHistoryTable({
  requests,
  employees,
  onSelect,
}: {
  requests: LeaveRequest[];
  employees?: Record<string, Employee>;
  onSelect: (request: LeaveRequest) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {employees && <TableHead>Employee</TableHead>}
          <TableHead>Type</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((r) => (
          <TableRow key={r.id} className="cursor-pointer" onClick={() => onSelect(r)}>
            {employees && (
              <TableCell className="font-medium text-foreground">
                {employees[r.employeeId]?.fullName ?? r.employeeId}
              </TableCell>
            )}
            <TableCell className="text-foreground">{LEAVE_TYPE_LABELS[r.leaveType] ?? r.leaveType}</TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {r.numberOfDays} day{r.numberOfDays === 1 ? "" : "s"}
            </TableCell>
            <TableCell className="text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
            <TableCell>
              <Badge variant={leaveStatusVariant(r.status)}>{r.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
