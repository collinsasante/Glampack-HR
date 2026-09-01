import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Payroll } from "./api/payroll";
import type { Employee } from "./api/employees";

function employeeName(employees: Employee[], employeeId: string) {
  return employees.find((e) => e.id === employeeId)?.fullName ?? employeeId;
}

function employeeDept(employees: Employee[], employeeId: string) {
  const emp = employees.find((e) => e.id === employeeId);
  return emp?.department ?? "";
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// Real client-side generation — no backend export endpoint exists, and none is
// needed for a CSV/PDF built from data the page already has in hand.
export function exportPayrollCsv(records: Payroll[], employees: Employee[], month: string) {
  const headers = [
    "Employee",
    "Department",
    "Basic Salary",
    "Total Allowances",
    "Gross Salary",
    "Total Deductions",
    "Net Salary",
    "Status",
    "Payment Date",
  ];
  const rows = records.map((r) => [
    employeeName(employees, r.employeeId),
    employeeDept(employees, r.employeeId),
    r.basicSalary,
    r.totalAllowances,
    r.grossSalary,
    r.totalDeductions,
    r.netSalary,
    r.status,
    r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Payroll_${month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportPayrollPdf(records: Payroll[], employees: Employee[], month: string) {
  const doc = new jsPDF("l", "mm", "a4");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Glampack HR — Payroll Summary", 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${month}`, 14, 23);

  autoTable(doc, {
    startY: 29,
    head: [["Employee", "Department", "Basic", "Allowances", "Gross", "Deductions", "Net", "Status"]],
    body: records.map((r) => [
      employeeName(employees, r.employeeId),
      employeeDept(employees, r.employeeId),
      r.basicSalary,
      r.totalAllowances,
      r.grossSalary,
      r.totalDeductions,
      r.netSalary,
      r.status,
    ]),
    styles: { fontSize: 8 },
  });

  doc.save(`Payroll_${month}.pdf`);
}
