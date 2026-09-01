"use client";

import { CalendarDays, LogIn, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listAnnouncements } from "@/lib/api/announcements";
import { listAttendance } from "@/lib/api/attendance";
import { listEmployees } from "@/lib/api/employees";
import { listLeaveRequests } from "@/lib/api/leave-requests";

interface ActivityItem {
  key: string;
  icon: typeof LogIn;
  text: string;
  at: Date;
}

function timeAgo(d: Date) {
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// A real chronological feed assembled from existing records (today's check-ins,
// recent leave submissions, recent announcements) — there's no dedicated activity
// log table, so this derives "activity" honestly from data that already exists
// rather than adding a fabricated feed.
export function RecentActivity() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    (async () => {
      const [employees, attendanceToday, leaveRequests, announcements] = await Promise.all([
        listEmployees(),
        listAttendance({ from: todayStr(), to: todayStr() }),
        listLeaveRequests({}),
        listAnnouncements(),
      ]);
      const nameOf = (id: string) => employees.find((e) => e.id === id)?.fullName ?? "An employee";

      const checkIns: ActivityItem[] = attendanceToday
        .filter((r) => r.checkInTime)
        .map((r) => ({
          key: `checkin-${r.id}`,
          icon: LogIn,
          text: `${nameOf(r.employeeId)} checked in`,
          at: new Date(r.checkInTime!),
        }));

      const leaveSubs: ActivityItem[] = leaveRequests.slice(0, 10).map((lr) => ({
        key: `leave-${lr.id}`,
        icon: CalendarDays,
        text: `${nameOf(lr.employeeId)} submitted a leave request`,
        at: new Date(lr.createdAt),
      }));

      const posts: ActivityItem[] = announcements.slice(0, 5).map((a) => ({
        key: `announcement-${a.id}`,
        icon: Megaphone,
        text: `Announcement published: ${a.title}`,
        at: new Date(a.createdAt),
      }));

      const merged = [...checkIns, ...leaveSubs, ...posts].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8);
      setItems(merged);
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items === null ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.key} className="flex items-start gap-2.5">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(item.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
