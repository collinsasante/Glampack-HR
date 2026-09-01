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
import { exportLeaveCsv, exportLeavePdf } from "@/lib/leave-export";
import type { LeaveRequest } from "@/lib/api/leave-requests";
import type { Employee } from "@/lib/api/employees";

export function ExportLeaveModal({
  open,
  onOpenChange,
  label,
  requests,
  employees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  requests: LeaveRequest[];
  employees: Employee[];
}) {
  const [format, setFormat] = useState<"csv" | "pdf">("csv");

  function handleExport() {
    if (format === "csv") exportLeaveCsv(requests, employees, label);
    else exportLeavePdf(requests, employees, label);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Leave Requests</DialogTitle>
          <DialogDescription>
            {requests.length} record{requests.length === 1 ? "" : "s"} will be exported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium text-foreground">Format</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="leave-export-format"
                  checked={format === "csv"}
                  onChange={() => setFormat("csv")}
                  className="accent-primary"
                />
                CSV
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="leave-export-format"
                  checked={format === "pdf"}
                  onChange={() => setFormat("pdf")}
                  className="accent-primary"
                />
                PDF
              </label>
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-sm font-medium text-foreground">Scope</Label>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={requests.length === 0}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
