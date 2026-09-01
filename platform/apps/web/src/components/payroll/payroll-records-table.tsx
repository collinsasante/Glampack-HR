"use client";

import { MoreHorizontal, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currency, humanize } from "@/lib/format";
import { downloadPayslip, previewPayslip } from "@/lib/payslip-pdf";
import type { Employee } from "@/lib/api/employees";
import type { Payroll } from "@/lib/api/payroll";
import type { Department } from "@glampack/shared";

const DEPARTMENTS: Department[] = [
  "Administration",
  "Management",
  "Production",
  "Operations",
  "CustomerService",
  "Logistics",
  "WarehousingAndFulfilment",
  "Finance",
  "Sales",
  "Marketing",
  "Engineering",
  "CreativeDesign",
  "Pakkmax",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusVariant(status: string): "success" | "warning" {
  return status === "Processed" || status === "Paid" ? "success" : "warning";
}

export function PayrollRecordsTable({
  records,
  employees,
  loading,
  onViewDetails,
  onProcess,
}: {
  records: Payroll[];
  employees: Employee[];
  loading: boolean;
  onViewDetails: (p: Payroll) => void;
  onProcess: (p: Payroll) => void;
}) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const emp = employeeById.get(r.employeeId);
      if (departmentFilter !== "all" && emp?.department !== departmentFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q) {
        const name = emp?.fullName.toLowerCase() ?? "";
        const email = emp?.email.toLowerCase() ?? "";
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [records, employeeById, search, departmentFilter, statusFilter]);

  function rowActions(r: Payroll, emp: Employee | undefined) {
    if (r.status === "Pending") {
      return (
        <>
          <DropdownMenuItem onClick={() => onViewDetails(r)}>View Details</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onProcess(r)}>Process Payroll</DropdownMenuItem>
        </>
      );
    }
    return (
      <>
        <DropdownMenuItem onClick={() => onViewDetails(r)}>View Details</DropdownMenuItem>
        {emp && (
          <>
            <DropdownMenuItem onClick={() => previewPayslip(r, emp)}>View Payslip</DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadPayslip(r, emp)}>Download Payslip</DropdownMenuItem>
          </>
        )}
      </>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div>
          <p className="font-heading text-base font-semibold text-foreground">Payroll Records</p>
          <p className="text-xs text-muted-foreground">{records.length} employees</p>
        </div>
      </CardHeader>
      <div className="flex flex-wrap items-center gap-3 px-6 pb-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v ?? "all")}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue>{departmentFilter === "all" ? "All departments" : humanize(departmentFilter)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>
                {humanize(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue>{statusFilter === "all" ? "All status" : statusFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Processed">Processed</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CardContent className="px-0">
        {loading ? (
          <div className="space-y-3 px-6 pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">No payroll records match your filters.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Gross Salary</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const emp = employeeById.get(r.employeeId);
                    return (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => onViewDetails(r)}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">
                                {emp ? initials(emp.fullName) : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{emp?.fullName ?? r.employeeId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {emp?.department ? humanize(emp.department) : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">{currency(r.basicSalary)}</TableCell>
                        <TableCell className="tabular-nums">{currency(r.grossSalary)}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {currency(r.totalDeductions)}
                        </TableCell>
                        <TableCell className="font-medium tabular-nums text-foreground">
                          {currency(r.netSalary)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Row actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">{rowActions(r, emp)}</DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 px-4 md:hidden">
              {filtered.map((r) => {
                const emp = employeeById.get(r.employeeId);
                return (
                  <div
                    key={r.id}
                    className="rounded-lg border border-border p-4"
                    onClick={() => onViewDetails(r)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {emp ? initials(emp.fullName) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{emp?.fullName ?? r.employeeId}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {emp?.department ? humanize(emp.department) : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Gross Salary</p>
                        <p className="tabular-nums text-foreground">{currency(r.grossSalary)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net Salary</p>
                        <p className="font-medium tabular-nums text-foreground">{currency(r.netSalary)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(r);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
