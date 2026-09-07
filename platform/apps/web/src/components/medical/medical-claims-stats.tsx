"use client";

import { Clock, HeartPulse, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MaskedCurrency } from "@/components/masked-currency";
import type { MedicalClaim } from "@/lib/api/medical-claims";

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Every figure is derived from real claims — there are no medical plans,
// coverage records, or appointments in the backend, so the cards report what
// actually exists: claim volume, review load, and real reimbursement totals.
export function MedicalClaimsStats({ claims }: { claims: MedicalClaim[] }) {
  const monthKey = currentMonthKey();
  const pending = claims.filter((c) => c.status === "Pending").length;
  const approvedThisMonth = claims.filter((c) => c.status === "Approved" && c.updatedAt.slice(0, 7) === monthKey).length;
  const totalReimbursed = claims
    .filter((c) => c.status === "Approved")
    .reduce((sum, c) => sum + Number(c.amountSpent), 0);

  const stats = [
    { label: "Total Claims", value: String(claims.length), sub: "All time", icon: HeartPulse },
    { label: "Pending Review", value: String(pending), sub: "Awaiting HR decision", icon: Clock },
    { label: "Approved This Month", value: String(approvedThisMonth), sub: "Decided this month", icon: ShieldCheck },
    { label: "Total Reimbursed", value: <MaskedCurrency amount={totalReimbursed} />, sub: "All approved claims", icon: Wallet },
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
