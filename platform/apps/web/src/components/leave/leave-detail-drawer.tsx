"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { humanize } from "@/lib/format";
import { leaveStatusVariant } from "@/lib/leave-status";
import type { LeaveRequest } from "@/lib/api/leave-requests";
import type { Employee } from "@/lib/api/employees";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  Vacation: "Vacation (Annual Leave)",
  Sick: "Sick Leave",
  Study: "Study Leave",
  Other: "Other (Emergency)",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function LeaveDetailDrawer({
  request,
  employee,
  approver,
  open,
  onOpenChange,
  canReview = false,
  cancelScope = "none",
  onApprove,
  onReject,
  onCancel,
}: {
  request: LeaveRequest | null;
  employee?: Employee;
  approver?: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canReview?: boolean;
  /** "self": employee can cancel their own Pending request. "staff": Admin/HR/Manager can cancel any Pending or Approved request. */
  cancelScope?: "self" | "staff" | "none";
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
  onCancel?: (id: string, reason: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"view" | "reject" | "cancel">("view");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!request) return null;

  function reset() {
    setMode("view");
    setReason("");
    setBusy(false);
  }

  async function handleApprove() {
    if (!onApprove) return;
    setBusy(true);
    try {
      await onApprove(request!.id);
      reset();
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmReject() {
    if (!onReject || !reason.trim()) return;
    setBusy(true);
    try {
      await onReject(request!.id, reason.trim());
      reset();
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmCancel() {
    if (!onCancel || !reason.trim()) return;
    setBusy(true);
    try {
      await onCancel(request!.id, reason.trim());
      reset();
    } finally {
      setBusy(false);
    }
  }

  const showApproveReject = canReview && request.status === "Pending" && mode === "view";
  const showCancel =
    mode === "view" &&
    ((cancelScope === "self" && request.status === "Pending") ||
      (cancelScope === "staff" && (request.status === "Pending" || request.status === "Approved")));

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
          <SheetTitle>Leave Request Details</SheetTitle>
          <p className="text-xs text-muted-foreground">Submitted {new Date(request.createdAt).toLocaleDateString()}</p>
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
            <Badge variant={leaveStatusVariant(request.status)}>{request.status}</Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Leave Type</p>
              <p className="font-heading text-base font-bold text-foreground">
                {LEAVE_TYPE_LABELS[request.leaveType] ?? request.leaveType}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-heading text-base font-bold text-foreground">
                {request.numberOfDays} day{request.numberOfDays === 1 ? "" : "s"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="text-sm text-foreground">{new Date(request.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">End Date</p>
              <p className="text-sm text-foreground">{new Date(request.endDate).toLocaleDateString()}</p>
            </div>
          </div>

          {request.notes && (
            <>
              <Separator />
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Employee Notes</p>
                <p className="text-sm text-foreground">{request.notes}</p>
              </div>
            </>
          )}

          {(request.status === "Approved" || request.status === "Rejected" || request.status === "Cancelled") && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                {request.status === "Approved" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approved By</span>
                      <span className="text-foreground">{approver?.fullName ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approval Date</span>
                      <span className="text-foreground">{new Date(request.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </>
                )}
                {request.adminComments && (
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">
                      {request.status === "Rejected" ? "Rejection Reason" : "Admin Comments"}
                    </p>
                    <p className="text-foreground">{request.adminComments}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {mode === "reject" && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Reason for rejection</p>
                <Textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this request is being rejected…"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleConfirmReject}
                    disabled={busy || !reason.trim()}
                  >
                    {busy ? "Rejecting…" : "Confirm Rejection"}
                  </Button>
                </div>
              </div>
            </>
          )}

          {mode === "cancel" && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Reason for cancellation</p>
                <Textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this request is being cancelled…"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
                    Back
                  </Button>
                  <Button size="sm" onClick={handleConfirmCancel} disabled={busy || !reason.trim()}>
                    {busy ? "Cancelling…" : "Confirm Cancellation"}
                  </Button>
                </div>
              </div>
            </>
          )}

          {(showApproveReject || showCancel) && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                {showCancel && (
                  <Button variant="outline" size="sm" onClick={() => setMode("cancel")}>
                    Cancel Request
                  </Button>
                )}
                {showApproveReject && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setMode("reject")}>
                      Reject
                    </Button>
                    <Button size="sm" onClick={handleApprove} disabled={busy}>
                      {busy ? "Approving…" : "Approve"}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
