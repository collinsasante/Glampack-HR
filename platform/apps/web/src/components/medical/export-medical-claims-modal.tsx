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
import { exportMedicalClaimsCsv, exportMedicalClaimsPdf } from "@/lib/medical-claim-export";
import type { MedicalClaim } from "@/lib/api/medical-claims";
import type { Employee } from "@/lib/api/employees";

export function ExportMedicalClaimsModal({
  open,
  onOpenChange,
  label,
  claims,
  employees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  claims: MedicalClaim[];
  employees: Employee[];
}) {
  const [format, setFormat] = useState<"csv" | "pdf">("csv");

  function handleExport() {
    if (format === "csv") exportMedicalClaimsCsv(claims, employees, label);
    else exportMedicalClaimsPdf(claims, employees, label);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Confidential Data?</DialogTitle>
          <DialogDescription>
            Medical information is confidential — only export data when authorized. {claims.length} record
            {claims.length === 1 ? "" : "s"} will be exported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium text-foreground">Format</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="medical-export-format"
                  checked={format === "csv"}
                  onChange={() => setFormat("csv")}
                  className="accent-primary"
                />
                CSV
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="medical-export-format"
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
          <Button onClick={handleExport} disabled={claims.length === 0}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
