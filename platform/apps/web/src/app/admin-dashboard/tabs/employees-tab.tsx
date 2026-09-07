"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listEmployees, updateEmployee, type Employee } from "@/lib/api/employees";
import { humanize } from "@/lib/format";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setEmployees(await listEmployees());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleToggleActive(emp: Employee) {
    const accountStatus = emp.accountStatus === "Active" ? "Inactive" : "Active";
    await updateEmployee(emp.id, { accountStatus });
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Employees ({employees.length})</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Change roles from the Roles &amp; Permissions tab.
        </p>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <div className="space-y-3 px-6 pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.fullName}</TableCell>
                      <TableCell>{emp.department && humanize(emp.department)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{emp.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={emp.accountStatus === "Active" ? "success" : "secondary"}>
                          {emp.accountStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(emp)}>
                          {emp.accountStatus === "Active" ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 px-4 md:hidden">
              {employees.map((emp) => (
                <div key={emp.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {initials(emp.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{emp.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {emp.department ? humanize(emp.department) : "—"}
                      </p>
                    </div>
                    <Badge variant={emp.accountStatus === "Active" ? "success" : "secondary"}>
                      {emp.accountStatus}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Badge variant="secondary">{emp.role}</Badge>
                    <Button variant="outline" size="sm" onClick={() => handleToggleActive(emp)}>
                      {emp.accountStatus === "Active" ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
