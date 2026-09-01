"use client";

import { CheckCircle2, ChevronRight, Megaphone, Wallet } from "lucide-react";
import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listAnnouncements, listMyReadAnnouncementIds } from "@/lib/api/announcements";
import { listLeaveRequests } from "@/lib/api/leave-requests";
import { listPayroll } from "@/lib/api/payroll";
import type { Employee } from "@/lib/api/employees";

interface AttentionItem {
  key: string;
  label: string;
  detail: string;
  href: string;
  icon: typeof CalendarClock;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Every item here reflects real, currently-true state — pending requests, actual
// unread announcements, an actually-processed payslip. Nothing is a placeholder,
// and the panel simply doesn't render an item when there's nothing to report.
export function AttentionPanel({ employee }: { employee: Employee }) {
  const [items, setItems] = useState<AttentionItem[] | null>(null);

  useEffect(() => {
    (async () => {
      const [pendingLeave, announcements, readIds, payroll] = await Promise.all([
        listLeaveRequests({ employeeId: employee.id, status: "Pending" }),
        listAnnouncements(),
        listMyReadAnnouncementIds(),
        listPayroll({ employeeId: employee.id, month: currentMonth() }),
      ]);

      const readSet = new Set(readIds);
      const unreadCount = announcements.filter((a) => !readSet.has(a.id)).length;
      const latestPayslip = payroll.find((p) => p.status === "Processed" || p.status === "Paid");

      const next: AttentionItem[] = [];
      if (pendingLeave.length > 0) {
        next.push({
          key: "leave",
          label: `${pendingLeave.length} leave request${pendingLeave.length === 1 ? "" : "s"} awaiting approval`,
          detail: `Submitted ${new Date(pendingLeave[0]!.createdAt).toLocaleDateString()}`,
          href: "/leave",
          icon: CalendarClock,
        });
      }
      if (unreadCount > 0) {
        next.push({
          key: "announcements",
          label: `${unreadCount} unread announcement${unreadCount === 1 ? "" : "s"}`,
          detail: "New updates from HR",
          href: "/announcements",
          icon: Megaphone,
        });
      }
      if (latestPayslip) {
        next.push({
          key: "payslip",
          label: "Payslip available",
          detail: `${latestPayslip.month} payroll`,
          href: "/payroll",
          icon: Wallet,
        });
      }
      setItems(next);
    })();
  }, [employee]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Needs Your Attention</CardTitle>
      </CardHeader>
      <CardContent>
        {items === null ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> You&apos;re all caught up — nothing requires your
            attention right now.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <item.icon className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                  </div>
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
