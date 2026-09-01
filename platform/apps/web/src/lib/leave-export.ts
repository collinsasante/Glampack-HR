import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LeaveRequest } from "./api/leave-requests";
import type { Employee } from "./api/employees";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// Real client-side export — no backend export endpoint exists, and none is
// needed for a file built entirely from data the page already has in hand.
export function exportLeaveCsv(requests: LeaveRequest[], employees: Employee[], label: string) {
  const employeeName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? id;
  const headers = ["Employee", "Type", "Start Date", "End Date", "Days", "Status", "Submitted", "Notes", "Admin Comments"];
  const rows = requests.map((r) => [
    employeeName(r.employeeId),
    r.leaveType,
    new Date(r.startDate).toLocaleDateString(),
    new Date(r.endDate).toLocaleDateString(),
    String(r.numberOfDays),
    r.status,
    new Date(r.createdAt).toLocaleDateString(),
    r.notes ?? "",
    r.adminComments ?? "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Leave_${label}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportLeavePdf(requests: LeaveRequest[], employees: Employee[], label: string) {
  const employeeName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? id;
  const doc = new jsPDF("l", "mm", "a4");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Glampack HR — Leave Report", 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${label}`, 14, 23);

  autoTable(doc, {
    startY: 29,
    head: [["Employee", "Type", "Start Date", "End Date", "Days", "Status", "Submitted"]],
    body: requests.map((r) => [
      employeeName(r.employeeId),
      r.leaveType,
      new Date(r.startDate).toLocaleDateString(),
      new Date(r.endDate).toLocaleDateString(),
      String(r.numberOfDays),
      r.status,
      new Date(r.createdAt).toLocaleDateString(),
    ]),
    styles: { fontSize: 8 },
  });

  doc.save(`Leave_${label}.pdf`);
}
