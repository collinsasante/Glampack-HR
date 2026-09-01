"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns3, MoreHorizontal, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listEmployees, updateEmployee, type Employee } from "@/lib/api/employees";
import { humanize } from "@/lib/format";
import { ApiError } from "@/lib/apiClient";
import type { Department, EmploymentType, Role } from "@glampack/shared";

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
const ROLES: Role[] = ["Employee", "Manager", "HR", "Admin"];
const EMPLOYMENT_TYPES: EmploymentType[] = ["FullTime", "PartTime", "Contract", "Temporary"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function EmployeesContent() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setEmployees(await listEmployees());
    } finally {
      setLoading(false);
    }
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (departmentFilter !== "all" && e.department !== departmentFilter) return false;
      if (roleFilter !== "all" && e.role !== roleFilter) return false;
      if (statusFilter !== "all" && e.accountStatus !== statusFilter) return false;
      if (employmentTypeFilter !== "all" && e.employmentType !== employmentTypeFilter) return false;
      if (q && !e.fullName.toLowerCase().includes(q) && !e.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [employees, search, departmentFilter, roleFilter, statusFilter, employmentTypeFilter]);

  useEffect(() => {
    setRowSelection({});
  }, [search, departmentFilter, roleFilter, statusFilter, employmentTypeFilter]);

  const filtersActive =
    search !== "" || departmentFilter !== "all" || roleFilter !== "all" || statusFilter !== "all" || employmentTypeFilter !== "all";

  function resetFilters() {
    setSearch("");
    setDepartmentFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
    setEmploymentTypeFilter("all");
  }

  const selectedEmployees = useMemo(
    () => filtered.filter((_, i) => rowSelection[i]),
    [filtered, rowSelection]
  );

  async function handleBulkDeactivate() {
    setBulkBusy(true);
    try {
      await Promise.all(
        selectedEmployees
          .filter((e) => e.accountStatus === "Active")
          .map((e) => updateEmployee(e.id, { accountStatus: "Inactive" }))
      );
      setRowSelection({});
      await refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "employee",
        header: "Employee",
        enableHiding: false,
        accessorFn: (e) => e.fullName,
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <Link href={`/employees/${emp.id}`} className="flex items-center gap-3 hover:opacity-80">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {initials(emp.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{emp.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{emp.email}</p>
              </div>
            </Link>
          );
        },
      },
      {
        id: "department",
        header: "Department",
        accessorFn: (e) => (e.department ? humanize(e.department) : "—"),
      },
      {
        id: "jobTitle",
        header: "Job Title",
        accessorFn: (e) => e.jobTitle ?? "—",
      },
      {
        id: "employmentStatus",
        header: "Employment",
        cell: ({ row }) => <span className="text-muted-foreground">{humanize(row.original.status)}</span>,
      },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) => {
          const emp = row.original;
          return (
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
          );
        },
      },
      {
        id: "leaveBalance",
        header: "Leave Balance",
        accessorFn: (e) => e.annualLeaveBalance,
        cell: ({ row }) => <span className="tabular-nums">{row.original.annualLeaveBalance} days</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.accountStatus === "Active" ? "success" : "secondary"}>
            {row.original.accountStatus}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Row actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href={`/employees/${row.original.id}`} />}>View</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleActive(row.original)}>
                  {row.original.accountStatus === "Active" ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} total employees</p>
        </div>
        <AddEmployeeDialog onCreated={refresh} />
      </div>

      <Card>
        <CardHeader className="flex flex-nowrap items-center gap-3 space-y-0 overflow-x-auto">
          <div className="relative w-56 shrink-0">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
          <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v ?? "all")}>
            <SelectTrigger className="w-44 shrink-0">
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
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
            <SelectTrigger className="w-36 shrink-0">
              <SelectValue>{roleFilter === "all" ? "All roles" : roleFilter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-36 shrink-0">
              <SelectValue>{statusFilter === "all" ? "All statuses" : statusFilter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={employmentTypeFilter} onValueChange={(v) => setEmploymentTypeFilter(v ?? "all")}>
            <SelectTrigger className="w-40 shrink-0">
              <SelectValue>{employmentTypeFilter === "all" ? "All employment types" : humanize(employmentTypeFilter)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employment types</SelectItem>
              {EMPLOYMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {humanize(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtersActive && (
            <Button variant="ghost" size="sm" className="shrink-0" onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="shrink-0" />}>
              <Columns3 className="h-4 w-4" /> Customize Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        {selectedEmployees.length > 0 && (
          <div className="mx-6 mb-2 flex items-center justify-between rounded-lg bg-muted px-4 py-2">
            <p className="text-sm text-foreground">
              {selectedEmployees.length} employee{selectedEmployees.length === 1 ? "" : "s"} selected
            </p>
            <Button variant="destructive" size="sm" onClick={handleBulkDeactivate} disabled={bulkBusy}>
              {bulkBusy ? "Deactivating…" : "Deactivate selected"}
            </Button>
          </div>
        )}

        <CardContent className="px-0">
          {error && <p className="mb-3 px-6 text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="space-y-3 px-6 pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">No employees match your filters.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-4">
                <p className="text-xs text-muted-foreground">
                  {Object.keys(rowSelection).length} of {filtered.length} row(s) selected.
                </p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">Rows per page</p>
                    <Select
                      value={String(table.getState().pagination.pageSize)}
                      onValueChange={(v) => table.setPageSize(Number(v))}
                    >
                      <SelectTrigger size="sm" className="w-16">
                        <SelectValue>{table.getState().pagination.pageSize}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50].map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                      disabled={!table.getCanNextPage()}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <RequireAuth allowRoles={["Admin", "HR", "Manager"]}>
      <AppShell>
        <EmployeesContent />
      </AppShell>
    </RequireAuth>
  );
}
