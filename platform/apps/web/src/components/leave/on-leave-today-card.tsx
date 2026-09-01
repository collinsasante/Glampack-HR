"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { humanize } from "@/lib/format";
import type { LeaveRequest } from "@/lib/api/leave-requests";
import type { Employee } from "@/lib/api/employees";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function OnLeaveTodayCard({ requests, employees }: { requests: LeaveRequest[]; employees: Employee[] }) {
  const today = new Date();
  const onLeave = requests.filter(
    (r) => r.status === "Approved" && new Date(r.startDate) <= today && today <= new Date(r.endDate)
  );
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">On Leave Today</CardTitle>
        <p className="text-xs text-muted-foreground">{onLeave.length} employee{onLeave.length === 1 ? "" : "s"}</p>
      </CardHeader>
      <CardContent>
        {onLeave.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one is on approved leave today.</p>
        ) : (
          <ul className="space-y-3">
            {onLeave.map((r) => {
              const emp = employeeById.get(r.employeeId);
              return (
                <li key={r.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                      {emp ? initials(emp.fullName) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{emp?.fullName ?? r.employeeId}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {emp?.department && humanize(emp.department)} · {r.leaveType}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    back {new Date(new Date(r.endDate).getTime() + 86400000).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
