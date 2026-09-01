"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPayroll } from "@/lib/api/payroll";
import { currency } from "@/lib/format";
import type { Employee } from "@/lib/api/employees";

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Creates a real payroll record per employee (basic salary only, all
// allowances/deductions start at 0 — totals are computed server-side, same as
// the existing single-record create flow). Employees with no salary on file are
// skipped and reported, never silently given a fabricated figure.
export function RunPayrollModal({
  open,
  onOpenChange,
  month,
  missingEmployees,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  missingEmployees: Employee[];
  onComplete: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const withSalary = missingEmployees.filter((e) => e.salary != null && Number(e.salary) > 0);
  const withoutSalary = missingEmployees.length - withSalary.length;
  const estimatedBasicTotal = withSalary.reduce((sum, e) => sum + Number(e.salary), 0);

  async function handleConfirm() {
    setRunning(true);
    setProgress({ done: 0, total: withSalary.length });
    let created = 0;
    for (const emp of withSalary) {
      try {
        await createPayroll({
          employeeId: emp.id,
          month,
          basicSalary: Number(emp.salary),
          housingAllowance: 0,
          transportAllowance: 0,
          benefits: 0,
          otherAllowances: 0,
          bonus: 0,
          incomeTax: 0,
          welfare: 0,
          socialSecurity: 0,
          healthInsurance: 0,
          otherDeductions: 0,
          customAllowances: [],
          customDeductions: [],
        });
        created += 1;
      } finally {
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
    }
    setRunning(false);
    onOpenChange(false);
    onComplete();
    toast.success("Payroll successfully processed.", {
      description: `${created} employee${created === 1 ? "" : "s"} added to ${monthLabel(month)} payroll.${
        withoutSalary > 0 ? ` ${withoutSalary} skipped — no salary on file.` : ""
      }`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run {monthLabel(month)} Payroll</DialogTitle>
          <DialogDescription>
            You are about to create payroll records for employees who don&apos;t have one yet this month.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Employees to add</span>
            <span className="font-semibold text-foreground tabular-nums">{withSalary.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated basic payroll</span>
            <span className="font-semibold text-foreground tabular-nums">{currency(estimatedBasicTotal)}</span>
          </div>
          {withoutSalary > 0 && (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              {withoutSalary} employee{withoutSalary === 1 ? "" : "s"} have no salary on file and will be skipped.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Records are created with basic salary only — allowances and deductions default to zero and can be
            edited per employee afterward. This will create {withSalary.length} new payroll record
            {withSalary.length === 1 ? "" : "s"}.
          </p>

          {running && progress && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {progress.done} of {progress.total} employees processed
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={running || withSalary.length === 0}>
            {running ? "Running…" : "Run Payroll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
