"use client";

import { CalendarClock, CheckCircle2, ChevronRight, HeartPulse, Megaphone, UserX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listAnnouncements, listMyReadAnnouncementIds } from "@/lib/api/announcements";
import { listAttendance } from "@/lib/api/attendance";
import { listEmployees } from "@/lib/api/employees";
import { listLeaveRequests } from "@/lib/api/leave-requests";
import { listMedicalClaims } from "@/lib/api/medical-claims";
import type { Employee } from "@/lib/api/employees";

interface AttentionItem {
  key: string;
  label: string;
  href: string;
  icon: typeof CalendarClock;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminAttentionPanel({ employee }: { employee: Employee }) {
  const [items, setItems] = useState<AttentionItem[] | null>(null);

  useEffect(() => {
    const isAdminOrHr = employee.role === "Admin" || employee.role === "HR";
    (async () => {
      const [employees, presentToday, pendingLeave, pendingClaims, announcements, readIds] = await Promise.all([
        listEmployees(),
        listAttendance({ from: todayStr(), to: todayStr() }),
        listLeaveRequests({ status: "Pending" }),
        isAdminOrHr ? listMedicalClaims({ status: "Pending" }) : Promise.resolve([]),
        listAnnouncements(),
        listMyReadAnnouncementIds(),
      ]);

      const active = employees.filter((e) => e.accountStatus === "Active");
      const presentIds = new Set(presentToday.filter((r) => r.checkInTime).map((r) => r.employeeId));
      const absentCount = active.filter((e) => !presentIds.has(e.id)).length;
      const readSet = new Set(readIds);
      const unreadCount = announcements.filter((a) => !readSet.has(a.id)).length;

      const next: AttentionItem[] = [];
      if (pendingLeave.length > 0) {
        next.push({
          key: "leave",
          label: `${pendingLeave.length} leave request${pendingLeave.length === 1 ? "" : "s"} awaiting approval`,
          href: "/admin-dashboard",
          icon: CalendarClock,
        });
      }
      if (isAdminOrHr && pendingClaims.length > 0) {
        next.push({
          key: "claims",
          label: `${pendingClaims.length} medical claim${pendingClaims.length === 1 ? "" : "s"} awaiting review`,
          href: "/admin-dashboard",
          icon: HeartPulse,
        });
      }
      if (absentCount > 0) {
        next.push({
          key: "absent",
          label: `${absentCount} employee${absentCount === 1 ? "" : "s"} absent today`,
          href: "/attendance",
          icon: UserX,
        });
      }
      if (unreadCount > 0) {
        next.push({
          key: "announcements",
          label: `${unreadCount} unread announcement${unreadCount === 1 ? "" : "s"}`,
          href: "/announcements",
          icon: Megaphone,
        });
      }
      setItems(next);
    })();
  }, [employee]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Needs Attention</CardTitle>
      </CardHeader>
      <CardContent>
        {items === null ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Nothing needs attention right now.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <item.icon className="h-4 w-4 shrink-0 text-primary" />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.label}</p>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
