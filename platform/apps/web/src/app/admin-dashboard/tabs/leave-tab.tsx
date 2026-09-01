"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { listEmployees, type Employee } from "@/lib/api/employees";

function statusVariant(status: string): "success" | "warning" | "destructive" {
  if (status === "Approved") return "success";
  if (status === "Rejected" || status === "Cancelled") return "destructive";
  return "warning";
}

export function LeaveTab() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const [reqs, emps] = await Promise.all([
      listLeaveRequests(statusFilter !== "all" ? { status: statusFilter } : {}),
      listEmployees(),
    ]);
    setRequests(reqs);
    setEmployees(Object.fromEntries(emps.map((e) => [e.id, e])));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleApprove(id: string) {
    setError(null);
    try {
      await approveLeaveRequest(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve");
    }
  }

  async function handleReject(id: string) {
    const comments = window.prompt("Reason for rejection:");
    if (!comments) return;
    await rejectLeaveRequest(id, comments);
    await refresh();
  }

  async function handleCancel(id: string) {
    const comments = window.prompt("Reason for cancellation:");
    if (!comments) return;
    await cancelLeaveRequest(id, comments);
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue>{statusFilter === "all" ? "All statuses" : statusFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-0">
        {error && <p className="mb-3 px-6 text-sm text-destructive">{error}</p>}
        {loading ? (
          <div className="space-y-3 px-6 pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <p className="px-6 text-sm text-muted-foreground">No leave requests found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{employees[r.employeeId]?.fullName ?? r.employeeId}</TableCell>
                  <TableCell>{r.leaveType}</TableCell>
                  <TableCell>
                    {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{r.numberOfDays}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    {r.status === "Pending" && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleApprove(r.id)}>
                          Approve
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleReject(r.id)}>
                          Reject
                        </Button>
                      </>
                    )}
                    {r.status === "Approved" && (
                      <Button variant="ghost" size="sm" onClick={() => handleCancel(r.id)}>
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
