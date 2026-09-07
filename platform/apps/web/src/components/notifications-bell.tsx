"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listAnnouncements, listMyReadAnnouncementIds } from "@/lib/api/announcements";
import { listLeaveRequests } from "@/lib/api/leave-requests";
import { listMedicalClaims } from "@/lib/api/medical-claims";
import { useAuth } from "@/lib/auth-context";
import { hasPermission, isStaffRole } from "@/lib/api/employees";

interface NotificationRow {
  key: string;
  label: string;
  href: string;
}

// All counts here come from real, already-actionable backend state — unread
// announcements (via the reads/me endpoint added alongside this), pending leave
// requests, pending medical claims — never a placeholder or invented number.
export function NotificationsBell() {
  const { employee } = useAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [total, setTotal] = useState(0);

  async function refresh() {
    if (!employee) return;
    const isStaff = isStaffRole(employee);
    const canViewClaims = hasPermission(employee, "medical_claims.view_all");

    const [announcements, readIds, pendingLeave, pendingClaims] = await Promise.all([
      listAnnouncements(),
      listMyReadAnnouncementIds(),
      isStaff ? listLeaveRequests({ status: "Pending" }) : Promise.resolve([]),
      canViewClaims ? listMedicalClaims({ status: "Pending" }) : Promise.resolve([]),
    ]);

    const readSet = new Set(readIds);
    const unreadCount = announcements.filter((a) => !readSet.has(a.id)).length;

    const next: NotificationRow[] = [];
    if (unreadCount > 0) {
      next.push({
        key: "announcements",
        label: `${unreadCount} unread announcement${unreadCount === 1 ? "" : "s"}`,
        href: "/announcements",
      });
    }
    if (pendingLeave.length > 0) {
      next.push({
        key: "leave",
        label: `${pendingLeave.length} leave request${pendingLeave.length === 1 ? "" : "s"} awaiting approval`,
        href: "/admin-dashboard",
      });
    }
    if (pendingClaims.length > 0) {
      next.push({
        key: "claims",
        label: `${pendingClaims.length} medical claim${pendingClaims.length === 1 ? "" : "s"} awaiting review`,
        href: "/admin-dashboard",
      });
    }

    setRows(next);
    setTotal(unreadCount + pendingLeave.length + pendingClaims.length);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <span className="relative inline-flex">
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
            >
              {total > 9 ? "9+" : total}
            </Badge>
          )}
        </span>
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Notifications</div>
        <DropdownMenuSeparator />
        {rows.length === 0 ? (
          <p className="px-1.5 py-3 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          rows.map((row) => (
            <DropdownMenuItem key={row.key} render={<Link href={row.href} />}>
              {row.label}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
