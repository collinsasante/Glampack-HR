"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaveRequest } from "@/lib/api/leave-requests";
import type { Employee } from "@/lib/api/employees";

const DOT_COLOR: Record<string, string> = {
  Approved: "bg-emerald-600",
  Pending: "bg-amber-500",
};

function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const startOffset = (first.getUTCDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function LeaveCalendar({
  requests,
  employees,
  title = "Leave Calendar",
}: {
  requests: LeaveRequest[];
  employees?: Record<string, Employee>;
  title?: string;
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const [selected, setSelected] = useState<string | null>(null);

  const relevant = useMemo(
    () => requests.filter((r) => r.status === "Approved" || r.status === "Pending"),
    [requests]
  );

  const cells = useMemo(() => monthGrid(cursor.getUTCFullYear(), cursor.getUTCMonth()), [cursor]);

  function requestsOn(d: Date) {
    return relevant.filter((r) => new Date(r.startDate) <= d && d <= new Date(r.endDate));
  }

  const selectedRequests = selected
    ? requestsOn(new Date(`${selected}T00:00:00.000Z`))
    : [];

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() - 1, 1)))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="w-28 text-center text-sm font-medium text-foreground">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" })}
          </p>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1)))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <div key={d} className="py-1 font-medium">
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const dStr = d.toISOString().slice(0, 10);
            const dayRequests = requestsOn(d);
            const isToday = dStr === todayStr;
            const isSelected = dStr === selected;
            return (
              <button
                key={dStr}
                type="button"
                disabled={dayRequests.length === 0}
                onClick={() => setSelected(isSelected ? null : dStr)}
                className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-xs transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : isToday
                      ? "border-border bg-muted"
                      : "border-transparent"
                } ${dayRequests.length > 0 ? "hover:bg-muted" : "cursor-default"}`}
              >
                <span className={isToday ? "font-bold text-foreground" : "text-foreground"}>{d.getUTCDate()}</span>
                {dayRequests.length > 0 && (
                  <span className="flex gap-0.5">
                    {Array.from(new Set(dayRequests.map((r) => r.status)))
                      .slice(0, 3)
                      .map((s) => (
                        <span key={s} className={`h-1 w-1 rounded-full ${DOT_COLOR[s]}`} />
                      ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Approved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Pending
          </span>
        </div>

        {selected && (
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              {new Date(`${selected}T00:00:00.000Z`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}
            </p>
            {selectedRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one on leave.</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">
                      {employees ? (employees[r.employeeId]?.fullName ?? r.employeeId) : r.leaveType}
                    </span>
                    <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLOR[r.status]}`} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
