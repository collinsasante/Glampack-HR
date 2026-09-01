"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { exportPayrollCsv, exportPayrollPdf } from "@/lib/payroll-export";
import type { Employee } from "@/lib/api/employees";
import type { Payroll } from "@/lib/api/payroll";

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ExportPayrollModal({
  open,
  onOpenChange,
  month,
  records,
  employees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  records: Payroll[];
  employees: Employee[];
}) {
  const [format, setFormat] = useState<"csv" | "pdf">("csv");

  function handleExport() {
    if (format === "csv") exportPayrollCsv(records, employees, month);
    else exportPayrollPdf(records, employees, month);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Payroll</DialogTitle>
          <DialogDescription>{records.length} record{records.length === 1 ? "" : "s"} will be exported.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium text-foreground">Format</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="export-format"
                  checked={format === "csv"}
                  onChange={() => setFormat("csv")}
                  className="accent-primary"
                />
                Excel / CSV
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="export-format"
                  checked={format === "pdf"}
                  onChange={() => setFormat("pdf")}
                  className="accent-primary"
                />
                PDF
              </label>
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-sm font-medium text-foreground">Period</Label>
            <p className="text-sm text-muted-foreground">{monthLabel(month)}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={records.length === 0}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
