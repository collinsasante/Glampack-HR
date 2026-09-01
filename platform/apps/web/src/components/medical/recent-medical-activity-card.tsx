"use client";

import { CheckCircle2, HeartPulse, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MedicalClaim } from "@/lib/api/medical-claims";
import type { Employee } from "@/lib/api/employees";

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

// Derived entirely from real claim timestamps — there is no separate audit-log
// table, so "submitted" comes from createdAt and a decision comes from
// updatedAt only once status has actually moved off Pending.
export function RecentMedicalActivityCard({
  claims,
  employeeById,
}: {
  claims: MedicalClaim[];
  employeeById: Record<string, Employee>;
}) {
  type Event = { c: MedicalClaim; at: string; kind: "submitted" | "approved" | "rejected" };

  const events = claims
    .flatMap((c): Event[] => {
      const items: Event[] = [{ c, at: c.createdAt, kind: "submitted" }];
      if (c.status !== "Pending") items.push({ c, at: c.updatedAt, kind: c.status === "Approved" ? "approved" : "rejected" });
      return items;
    })
    .sort((x, y) => (x.at < y.at ? 1 : -1))
    .slice(0, 5);

  const ICONS = { submitted: HeartPulse, approved: CheckCircle2, rejected: XCircle };

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
              const emp = employeeById[e.c.employeeId];
              const Icon = ICONS[e.kind];
              return (
                <li key={`${e.c.id}-${e.kind}-${i}`} className="flex items-start gap-2.5 text-sm">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground">
                      {e.kind === "submitted" ? (
                        <>
                          <span className="font-medium">{emp?.fullName ?? "Unknown"}</span> submitted a claim for{" "}
                          <span className="font-medium">{e.c.hospitalClinicName}</span>
                        </>
                      ) : (
                        <>
                          Claim from <span className="font-medium">{emp?.fullName ?? "Unknown"}</span> was {e.kind}
                        </>
                      )}
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
