"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { currency } from "@/lib/format";
import { claimStatusVariant } from "@/lib/medical-claim-format";
import type { MedicalClaim } from "@/lib/api/medical-claims";
import type { Employee } from "@/lib/api/employees";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MedicalClaimCard({
  claim,
  employee,
  onView,
}: {
  claim: MedicalClaim;
  employee?: Employee;
  onView: (c: MedicalClaim) => void;
}) {
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onView(claim)}>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Avatar size="sm">
              <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                {employee ? initials(employee.fullName) : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{employee?.fullName ?? claim.employeeId}</span>
          </div>
          <Badge variant={claimStatusVariant(claim.status)}>{claim.status}</Badge>
        </div>

        <div>
          <p className="text-sm text-foreground">{claim.hospitalClinicName}</p>
          <p className="text-xs text-muted-foreground">{new Date(claim.dateOfVisit).toLocaleDateString()}</p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="font-medium tabular-nums text-foreground">{currency(Number(claim.amountSpent))}</span>
          <span className="text-xs text-muted-foreground">
            Submitted {new Date(claim.createdAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
