"use client";

import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PayrollStatusCard({
  processedCount,
  pendingCount,
  totalEmployees,
  lastProcessedDate,
  onStartPayroll,
}: {
  processedCount: number;
  pendingCount: number;
  totalEmployees: number;
  lastProcessedDate: Date | null;
  onStartPayroll: () => void;
}) {
  const hasAnyRecords = processedCount + pendingCount > 0;
  const pct = totalEmployees > 0 ? Math.round((processedCount / totalEmployees) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payroll Status</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAnyRecords ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Payroll not processed</p>
            <Button size="sm" onClick={onStartPayroll}>
              Start Payroll
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Processed</span>
                <span className="font-semibold text-foreground tabular-nums">{processedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-semibold text-foreground tabular-nums">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Employees</span>
                <span className="font-semibold text-foreground tabular-nums">{totalEmployees}</span>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{pct}% processed</p>

            {lastProcessedDate && (
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                Last processed <span className="text-foreground">{lastProcessedDate.toLocaleDateString()}</span>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
