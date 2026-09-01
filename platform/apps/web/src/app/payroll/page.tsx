"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { AdminPayrollView } from "@/components/payroll/admin-payroll-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { listPayroll, type Payroll } from "@/lib/api/payroll";
import { downloadPayslip } from "@/lib/payslip-pdf";

function statusVariant(status: string): "success" | "warning" {
  if (status === "Paid" || status === "Processed") return "success";
  return "warning";
}

function PayrollContent() {
  const { employee } = useAuth();
  const [records, setRecords] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee) return;
    listPayroll({ employeeId: employee.id })
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [employee]);

  if (!employee) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Payroll</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payslips</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="space-y-3 px-6 pb-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">No payslips yet.</p>
          ) : (
            <ul className="divide-y">
              {records.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{p.month}</p>
                    <p className="text-muted-foreground">Net Salary: GH₵{p.netSalary}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    <Button variant="outline" size="sm" onClick={() => downloadPayslip(p, employee)}>
                      <Download className="h-3.5 w-3.5" /> Payslip
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PayrollPageContent() {
  const { employee } = useAuth();
  if (!employee) return null;
  const isAdminOrHr = employee.role === "Admin" || employee.role === "HR";
  return isAdminOrHr ? <AdminPayrollView /> : <PayrollContent />;
}

export default function PayrollPage() {
  return (
    <RequireAuth>
      <AppShell>
        <PayrollPageContent />
      </AppShell>
    </RequireAuth>
  );
}
