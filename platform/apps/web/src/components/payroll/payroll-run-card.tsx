"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function PayrollRunCard({
  month,
  totalEmployees,
  processedCount,
  pendingCount,
  onReview,
  onProcessPending,
  processing,
  processProgress,
}: {
  month: string;
  totalEmployees: number;
  processedCount: number;
  pendingCount: number;
  onReview: () => void;
  onProcessPending: () => void;
  processing: boolean;
  processProgress: { done: number; total: number } | null;
}) {
  const pct = totalEmployees > 0 ? Math.round((processedCount / totalEmployees) * 100) : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <p className="font-heading text-lg font-bold text-foreground">{monthLabel(month)} Payroll</p>
        <p className="text-sm text-muted-foreground">Payroll processing</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <p>
            <span className="font-semibold text-foreground tabular-nums">{totalEmployees}</span>{" "}
            <span className="text-muted-foreground">Employees</span>
          </p>
          <p>
            <span className="font-semibold text-foreground tabular-nums">{processedCount}</span>{" "}
            <span className="text-muted-foreground">Processed</span>
          </p>
          <p>
            <span className="font-semibold text-foreground tabular-nums">{pendingCount}</span>{" "}
            <span className="text-muted-foreground">Pending</span>
          </p>
        </div>

        {processing && processProgress ? (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Processing payroll…</p>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(processProgress.done / processProgress.total) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {processProgress.done} of {processProgress.total} employees processed
            </p>
          </div>
        ) : (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{pct}%</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onReview} disabled={processing}>
            Review Payroll
          </Button>
          <Button size="sm" onClick={onProcessPending} disabled={processing || pendingCount === 0}>
            {processing ? "Processing…" : "Process Payroll"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
