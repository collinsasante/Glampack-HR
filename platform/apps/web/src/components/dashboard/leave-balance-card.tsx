"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listLeaveRequests } from "@/lib/api/leave-requests";
import type { Employee } from "@/lib/api/employees";

const ANNUAL_ENTITLEMENT = 20;

export function LeaveBalanceCard({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    listLeaveRequests({ employeeId: employee.id, status: "Pending" }).then((r) => setPendingCount(r.length));
  }, [employee]);

  const remaining = employee.annualLeaveBalance;
  const used = Math.max(0, ANNUAL_ENTITLEMENT - remaining);
  const pct = Math.min(100, Math.round((used / ANNUAL_ENTITLEMENT) * 100));

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => router.push("/leave")}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && router.push("/leave")}
      className="cursor-pointer transition-shadow hover:shadow-md"
    >
      <CardHeader>
        <CardTitle className="text-base">Leave Balance</CardTitle>
        <p className="text-xs text-muted-foreground">Annual Leave</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-heading text-2xl font-bold text-foreground">{remaining} days remaining</p>
          <p className="text-xs text-muted-foreground">
            {used} days used · {ANNUAL_ENTITLEMENT} total days
          </p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        {pendingCount !== null && pendingCount > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{pendingCount}</span> pending request
            {pendingCount === 1 ? "" : "s"}
          </p>
        )}

        <div onClick={(e) => e.stopPropagation()}>
          <Button className="w-full" size="sm" nativeButton={false} render={<Link href="/leave" />}>
            Request Leave
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
