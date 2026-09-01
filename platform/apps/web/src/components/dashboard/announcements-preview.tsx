"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listAnnouncements, listMyReadAnnouncementIds, type Announcement } from "@/lib/api/announcements";

function typeColor(type: string, priority: string | null) {
  if (priority === "High" || type === "Urgent") return "bg-red-500";
  if (priority === "Medium") return "bg-amber-500";
  return "bg-muted-foreground/40";
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function AnnouncementsPreview() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([listAnnouncements(), listMyReadAnnouncementIds()]).then(([a, r]) => {
      setAnnouncements(a.slice(0, 3));
      setReadIds(new Set(r));
    });
  }, []);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => router.push("/announcements")}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && router.push("/announcements")}
      className="cursor-pointer transition-shadow hover:shadow-md"
    >
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Announcements</CardTitle>
        <Link href="/announcements" className="text-xs font-medium text-primary hover:opacity-70">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {announcements === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">You&apos;re all caught up — no new announcements.</p>
        ) : (
          <ul className="space-y-3">
            {announcements.map((a) => (
              <li key={a.id}>
                <Link href="/announcements" className="flex items-start gap-2.5">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${typeColor(a.type, a.priority)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                      {!readIds.has(a.id) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{a.message}</p>
                    <p className="text-[11px] text-muted-foreground">{timeAgo(a.createdAt)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
