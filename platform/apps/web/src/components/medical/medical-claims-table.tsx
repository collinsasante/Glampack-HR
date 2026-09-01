"use client";

import { Eye, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export function MedicalClaimsTable({
  claims,
  employeeById,
  onView,
}: {
  claims: MedicalClaim[];
  employeeById: Record<string, Employee>;
  onView: (c: MedicalClaim) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Clinic / Visit</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {claims.map((c) => {
          const emp = employeeById[c.employeeId];
          return (
            <TableRow key={c.id} className="cursor-pointer" onClick={() => onView(c)}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                      {emp ? initials(emp.fullName) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{emp?.fullName ?? c.employeeId}</span>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-foreground">{c.hospitalClinicName}</p>
                <p className="text-xs text-muted-foreground">{new Date(c.dateOfVisit).toLocaleDateString()}</p>
              </TableCell>
              <TableCell className="font-medium tabular-nums text-foreground">
                {currency(Number(c.amountSpent))}
              </TableCell>
              <TableCell className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant={claimStatusVariant(c.status)}>{c.status}</Badge>
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Row actions</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(c)}>
                      <Eye className="h-3.5 w-3.5" /> {c.status === "Pending" ? "Review" : "View"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
