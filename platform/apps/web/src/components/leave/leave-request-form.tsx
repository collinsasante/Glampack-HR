"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/apiClient";
import { createLeaveRequest } from "@/lib/api/leave-requests";
import { todayStr } from "@/lib/dates";
import type { LeaveType } from "@glampack/shared";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  Vacation: "Vacation (Annual Leave)",
  Sick: "Sick Leave",
  Study: "Study Leave",
  Other: "Other (Emergency)",
};

function inclusiveDays(start: string, end: string) {
  if (!start || !end) return null;
  const s = new Date(`${start}T00:00:00.000Z`);
  const e = new Date(`${end}T00:00:00.000Z`);
  if (e < s) return null;
  return Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

export function LeaveRequestForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [leaveType, setLeaveType] = useState<LeaveType>("Vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => inclusiveDays(startDate, endDate), [startDate, endDate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createLeaveRequest({
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        notes: notes || undefined,
      });
      toast.success("Leave request submitted", {
        description: "You'll be notified once it's reviewed.",
      });
      setStartDate("");
      setEndDate("");
      setNotes("");
      onSubmitted();
    } catch (err) {
      // Server-side rule violations (quarterly limit, Nov/Dec block, 20-day cap, etc.)
      // surface here with the exact message the API returned.
      setError(err instanceof ApiError ? err.message : "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Request Leave</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <Label>Leave Type</Label>
              <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-end sm:col-span-1">
              {days !== null && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{days}</span> day{days === 1 ? "" : "s"} requested
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                required
                min={leaveType === "Other" ? todayStr() : undefined}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                required
                min={startDate || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {leaveType === "Vacation" && (
            <p className="text-xs text-muted-foreground">
              Vacation leave: max 7 days per quarter, one request per quarter, not allowed in November/December.
            </p>
          )}
          {leaveType === "Other" && (
            <p className="text-xs text-muted-foreground">Emergency (Other) leave must start today.</p>
          )}
          {error && <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
