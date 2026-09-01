"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { attendanceDuration, attendanceStatus, attendanceStatusVariant } from "@/lib/attendance-status";
import { humanize } from "@/lib/format";
import type { AttendanceRecord } from "@/lib/api/attendance";
import type { Employee } from "@/lib/api/employees";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export interface AttendanceMonthSummary {
  present: number;
  late: number;
  totalMinutes: number;
}

export function AttendanceDetailDrawer({
  record,
  employee,
  monthSummary,
  open,
  onOpenChange,
}: {
  record: AttendanceRecord | null;
  employee?: Employee;
  monthSummary?: AttendanceMonthSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!record) return null;

  const status = attendanceStatus(record);
  const duration = attendanceDuration(record);
  const checkInLocation = record.checkInCity ? [record.checkInCity, record.checkInRegion].filter(Boolean).join(", ") : null;
  const checkOutLocation = record.checkOutCity
    ? [record.checkOutCity, record.checkOutRegion].filter(Boolean).join(", ")
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Attendance Details</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {new Date(record.date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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
            <Badge variant={attendanceStatusVariant(status)}>{status}</Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Check In</p>
              <p className="font-heading text-lg font-bold text-foreground">
                {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Location {checkInLocation ? "Verified" : "Not recorded"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Check Out</p>
              <p className="font-heading text-lg font-bold text-foreground">
                {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Location {checkOutLocation ? "Verified" : record.checkOutTime ? "Not recorded" : "—"}
              </p>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg bg-muted p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Total Working Time</p>
            <p className="font-heading text-2xl font-bold text-foreground">{duration ?? "In progress"}</p>
          </div>

          {(checkInLocation || checkOutLocation) && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                {checkInLocation && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-in Location</span>
                    <span className="text-foreground">{checkInLocation}</span>
                  </div>
                )}
                {checkOutLocation && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-out Location</span>
                    <span className="text-foreground">{checkOutLocation}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {monthSummary && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">This Month</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Present</p>
                    <p className="font-medium text-foreground tabular-nums">{monthSummary.present} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Late</p>
                    <p className="font-medium text-foreground tabular-nums">{monthSummary.late} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                    <p className="font-medium text-foreground tabular-nums">
                      {Math.floor(monthSummary.totalMinutes / 60)}h {monthSummary.totalMinutes % 60}m
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
