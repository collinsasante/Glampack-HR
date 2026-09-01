"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Announcement } from "@/lib/api/announcements";

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Every figure here is derived from real announcements/reads — there's no
// Published/Scheduled/Draft concept in the backend (every row that exists is
// already live the moment it's created), so the cards report what's actually
// trackable: volume, recency, urgency, and real read engagement.
export function AnnouncementStats({
  announcements,
  readCounts,
  activeEmployeeCount,
}: {
  announcements: Announcement[];
  readCounts: Map<string, number>;
  activeEmployeeCount: number;
}) {
  const monthKey = currentMonthKey();
  const postedThisMonth = announcements.filter((a) => a.createdAt.slice(0, 7) === monthKey).length;
  const highPriority = announcements.filter((a) => a.priority === "High").length;

  let readRate = 0;
  if (announcements.length > 0 && activeEmployeeCount > 0) {
    const totalReads = announcements.reduce((sum, a) => sum + (readCounts.get(a.id) ?? 0), 0);
    readRate = Math.round((totalReads / (announcements.length * activeEmployeeCount)) * 100);
  }

  const stats = [
    { label: "Total Announcements", value: String(announcements.length), sub: "All time", icon: Megaphone },
    { label: "Posted This Month", value: String(postedThisMonth), sub: "New this month", icon: CalendarClock },
    { label: "High Priority", value: String(highPriority), sub: "Needs attention", icon: AlertTriangle },
    { label: "Avg. Read Rate", value: `${readRate}%`, sub: "Across active employees", icon: CheckCircle2 },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="flex items-start justify-between py-4">
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-heading mt-1 text-2xl font-bold tabular-nums text-foreground">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <s.icon className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
