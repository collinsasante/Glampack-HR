"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MaskedCurrency } from "@/components/masked-currency";
import { ApiError } from "@/lib/apiClient";
import { listEmployees, type Employee } from "@/lib/api/employees";
import { createPayroll, listPayroll, processPayroll, type Payroll } from "@/lib/api/payroll";

const emptyForm = {
  employeeId: "",
  month: "",
  basicSalary: "",
  housingAllowance: "0",
  transportAllowance: "0",
  incomeTax: "0",
  socialSecurity: "0",
};

function statusVariant(status: string): "success" | "warning" {
  return status === "Processed" || status === "Paid" ? "success" : "warning";
}

export function PayrollTab() {
  const [records, setRecords] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [monthFilter, setMonthFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const [payrollList, employeeList] = await Promise.all([
      listPayroll(monthFilter ? { month: monthFilter } : {}),
      listEmployees(),
    ]);
    setRecords(payrollList);
    setEmployees(employeeList);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter]);

  const employeeName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? id;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createPayroll({
        employeeId: form.employeeId,
        month: form.month,
        basicSalary: Number(form.basicSalary),
        housingAllowance: Number(form.housingAllowance),
        transportAllowance: Number(form.transportAllowance),
        benefits: 0,
        otherAllowances: 0,
        bonus: 0,
        incomeTax: Number(form.incomeTax),
        welfare: 0,
        socialSecurity: Number(form.socialSecurity),
        healthInsurance: 0,
        otherDeductions: 0,
        customAllowances: [],
        customDeductions: [],
      });
      setForm(emptyForm);
      setShowCreate(false);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create payroll record");
    }
  }

  async function handleProcess(id: string) {
    await processPayroll(id, { status: "Processed", paymentDate: new Date() });
    await refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-44"
        />
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4" /> {showCreate ? "Cancel" : "New Payroll Record"}
        </Button>
      </CardHeader>

      {showCreate && (
        <CardContent>
          <form onSubmit={handleCreate} className="grid grid-cols-3 gap-3 rounded-lg border p-4">
            <Select value={form.employeeId} onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v ?? "" }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              required
              placeholder="Month (YYYY-MM)"
              value={form.month}
              onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
            />
            <Input
              required
              type="number"
              placeholder="Basic Salary"
              value={form.basicSalary}
              onChange={(e) => setForm((f) => ({ ...f, basicSalary: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Housing Allowance"
              value={form.housingAllowance}
              onChange={(e) => setForm((f) => ({ ...f, housingAllowance: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Transport Allowance"
              value={form.transportAllowance}
              onChange={(e) => setForm((f) => ({ ...f, transportAllowance: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Income Tax"
              value={form.incomeTax}
              onChange={(e) => setForm((f) => ({ ...f, incomeTax: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Social Security"
              value={form.socialSecurity}
              onChange={(e) => setForm((f) => ({ ...f, socialSecurity: e.target.value }))}
            />
            {error && <p className="col-span-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="col-span-3">
              Create (totals computed server-side)
            </Button>
          </form>
        </CardContent>
      )}

      <CardContent className="px-0">
        {loading ? (
          <div className="space-y-3 px-6 pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <p className="px-6 text-sm text-muted-foreground">No payroll records found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{employeeName(p.employeeId)}</TableCell>
                  <TableCell>{p.month}</TableCell>
                  <TableCell>
                    <MaskedCurrency amount={p.netSalary} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === "Pending" && (
                      <Button variant="ghost" size="sm" onClick={() => handleProcess(p.id)}>
                        Mark Processed
                      </Button>
                    )}
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
