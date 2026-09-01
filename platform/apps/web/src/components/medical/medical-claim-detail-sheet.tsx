"use client";

import { Download, FileText, Lock } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { currency, humanize } from "@/lib/format";
import { claimStatusVariant } from "@/lib/medical-claim-format";
import type { MedicalClaim } from "@/lib/api/medical-claims";
import type { Employee } from "@/lib/api/employees";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MedicalClaimDetailSheet({
  claim,
  employee,
  canReview,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: {
  claim: MedicalClaim | null;
  employee?: Employee;
  canReview: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, notes: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"view" | "reject">("view");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  if (!claim) return null;

  function reset() {
    setMode("view");
    setNotes("");
    setBusy(false);
  }

  async function handleApprove() {
    if (!onApprove) return;
    setBusy(true);
    try {
      await onApprove(claim!.id);
      reset();
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmReject() {
    if (!onReject || !notes.trim()) return;
    setBusy(true);
    try {
      await onReject(claim!.id, notes.trim());
      reset();
    } finally {
      setBusy(false);
    }
  }

  const showActions = canReview && claim.status === "Pending" && mode === "view";

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Medical Claim</SheetTitle>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Confidential — visible only to you and HR/Admin
          </p>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {employee && (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                    {initials(employee.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{employee.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {employee.department && humanize(employee.department)}
                    {employee.jobTitle ? ` · ${employee.jobTitle}` : ""}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={claimStatusVariant(claim.status)}>{claim.status}</Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Hospital / Clinic</p>
              <p className="text-sm font-medium text-foreground">{claim.hospitalClinicName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date of Visit</p>
              <p className="text-sm font-medium text-foreground">{new Date(claim.dateOfVisit).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Amount Spent</p>
            <p className="font-heading text-2xl font-bold text-foreground">{currency(Number(claim.amountSpent))}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-muted-foreground">Description of Treatment</p>
            <p className="text-sm text-foreground">{claim.descriptionOfTreatment}</p>
          </div>

          {claim.receipts.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">Receipts</p>
                <ul className="space-y-2">
                  {claim.receipts.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{r.filename}</span>
                      <a href={r.url} target="_blank" rel="noreferrer" download>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Download receipt">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {claim.adminNotes && (
            <>
              <Separator />
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  {claim.status === "Rejected" ? "Rejection Reason" : "Admin Notes"}
                </p>
                <p className="text-sm text-foreground">{claim.adminNotes}</p>
              </div>
            </>
          )}

          {claim.status !== "Pending" && (
            <p className="text-xs text-muted-foreground">
              Decided {new Date(claim.updatedAt).toLocaleDateString()}
            </p>
          )}

          {mode === "reject" && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Reason for rejection</p>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explain why this claim is being rejected…"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
                    Back
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleConfirmReject} disabled={busy || !notes.trim()}>
                    {busy ? "Rejecting…" : "Confirm Rejection"}
                  </Button>
                </div>
              </div>
            </>
          )}

          {showActions && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setMode("reject")}>
                  Reject
                </Button>
                <Button size="sm" onClick={handleApprove} disabled={busy}>
                  {busy ? "Approving…" : "Approve"}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
