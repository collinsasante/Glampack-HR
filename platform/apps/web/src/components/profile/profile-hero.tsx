"use client";

import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { humanize } from "@/lib/format";
import type { Employee } from "@/lib/api/employees";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileHero({ employee, onEdit }: { employee: Employee; onEdit: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 py-6 text-center sm:flex-row sm:items-center sm:text-left">
        <Avatar size="lg" className="h-20 w-20 shrink-0">
          <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
            {initials(employee.fullName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-heading text-xl font-bold text-foreground">{employee.fullName}</h1>
            <Badge variant={employee.accountStatus === "Active" ? "success" : "secondary"}>
              {employee.accountStatus === "Active" ? "Active Employee" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{employee.jobTitle ?? employee.role}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {employee.employeeId}
            {employee.department ? ` · ${humanize(employee.department)}` : ""}
            {employee.joiningDate ? ` · Joined ${new Date(employee.joiningDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : ""}
          </p>
        </div>

        <Button variant="outline" onClick={onEdit} className="shrink-0">
          <Pencil className="h-4 w-4" /> Edit Profile
        </Button>
      </CardContent>
    </Card>
  );
}
