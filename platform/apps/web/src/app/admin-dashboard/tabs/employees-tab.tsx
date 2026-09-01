"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/apiClient";
import { listEmployees, updateEmployee, type Employee } from "@/lib/api/employees";
import { humanize } from "@/lib/format";
import type { Role } from "@glampack/shared";

const ROLES: Role[] = ["Employee", "Manager", "HR", "Admin"];

export function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setEmployees(await listEmployees());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleRoleChange(id: string, role: Role) {
    setError(null);
    try {
      await updateEmployee(id, { role });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update role");
    }
  }

  async function handleToggleActive(emp: Employee) {
    const accountStatus = emp.accountStatus === "Active" ? "Inactive" : "Active";
    await updateEmployee(emp.id, { accountStatus });
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Employees ({employees.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {error && <p className="mb-3 px-6 text-sm text-destructive">{error}</p>}
        {loading ? (
          <div className="space-y-3 px-6 pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
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
                    <Select value={emp.role} onValueChange={(v) => handleRoleChange(emp.id, v as Role)}>
                      <SelectTrigger size="sm" className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
        )}
      </CardContent>
    </Card>
  );
}
