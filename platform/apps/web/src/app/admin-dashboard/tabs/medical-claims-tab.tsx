"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { approveMedicalClaim, listMedicalClaims, rejectMedicalClaim, type MedicalClaim } from "@/lib/api/medical-claims";
import { listEmployees, type Employee } from "@/lib/api/employees";

function statusVariant(status: string): "success" | "destructive" | "warning" {
  if (status === "Approved") return "success";
  if (status === "Rejected") return "destructive";
  return "warning";
}

export function MedicalClaimsTab() {
  const [claims, setClaims] = useState<MedicalClaim[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const [claimList, employeeList] = await Promise.all([
      listMedicalClaims(statusFilter !== "all" ? { status: statusFilter } : {}),
      listEmployees(),
    ]);
    setClaims(claimList);
    setEmployees(employeeList);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const employeeName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? id;

  async function handleApprove(id: string) {
    await approveMedicalClaim(id, { adminNotes: "Receipt verified" });
    await refresh();
  }

  async function handleReject(id: string) {
    const adminNotes = window.prompt("Reason for rejection:");
    if (!adminNotes) return;
    await rejectMedicalClaim(id, { adminNotes });
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
        ) : claims.length === 0 ? (
          <p className="px-6 text-sm text-muted-foreground">No medical claims found.</p>
        ) : (
          <ul className="divide-y">
            {claims.map((c) => (
              <li key={c.id} className="px-6 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {employeeName(c.employeeId)} · {c.hospitalClinicName}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(c.dateOfVisit).toLocaleDateString()} · GH₵{c.amountSpent}
                    </p>
                    <p className="text-muted-foreground">{c.descriptionOfTreatment}</p>
                    {c.receipts.length > 0 && (
                      <a
                        href={c.receipts[0]!.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline underline-offset-2 hover:opacity-70"
                      >
                        View receipt
                      </a>
                    )}
                  </div>
                  {c.status === "Pending" ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleApprove(c.id)}>
                        Approve
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleReject(c.id)}>
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
