"use client";

import { Megaphone, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { timeAgo } from "@/lib/announcement-format";
import type { Announcement } from "@/lib/api/announcements";
import type { Employee } from "@/lib/api/employees";

// Derived entirely from real announcement timestamps — no separate activity
// log exists, so "posted" comes from createdAt and "updated" from updatedAt
// only when it genuinely differs from createdAt (a real edit happened).
export function RecentActivityCard({
  announcements,
  employeeById,
}: {
  announcements: Announcement[];
  employeeById: Record<string, Employee>;
}) {
  const events = announcements
    .flatMap((a) => {
      const items = [{ a, at: a.createdAt, edited: false }];
      if (a.updatedAt !== a.createdAt) items.push({ a, at: a.updatedAt, edited: true });
      return items;
    })
    .sort((x, y) => (x.at < y.at ? 1 : -1))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e, i) => {
              const author = employeeById[e.a.postedByEmployeeId];
              const Icon = e.edited ? Pencil : Megaphone;
              return (
                <li key={`${e.a.id}-${e.edited}-${i}`} className="flex items-start gap-2.5 text-sm">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground">
                      <span className="font-medium">{author?.fullName ?? "Unknown"}</span>{" "}
                      {e.edited ? "edited" : "posted"} <span className="font-medium">{e.a.title}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{timeAgo(e.at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
