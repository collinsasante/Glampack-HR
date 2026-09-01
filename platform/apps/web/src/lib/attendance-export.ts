import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AttendanceRecord } from "./api/attendance";
import type { Employee } from "./api/employees";
import { attendanceDuration, attendanceStatus } from "./attendance-status";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// Real client-side CSV generation — no backend export endpoint exists, and none
// is needed for a file built entirely from data the page already has in hand.
export function exportAttendanceCsv(records: AttendanceRecord[], employees: Employee[], label: string) {
  const employeeName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? id;
  const headers = ["Employee", "Date", "Check In", "Check Out", "Duration", "Status", "Location"];
  const rows = records.map((r) => [
    employeeName(r.employeeId),
    new Date(r.date).toLocaleDateString(),
    r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "",
    r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "",
    attendanceDuration(r) ?? "",
    attendanceStatus(r),
    [r.checkInCity, r.checkInRegion].filter(Boolean).join(", "),
  ]);
  const csv = [headers, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Attendance_${label}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportAttendancePdf(records: AttendanceRecord[], employees: Employee[], label: string) {
  const employeeName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? id;
  const doc = new jsPDF("l", "mm", "a4");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Glampack HR — Attendance Report", 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${label}`, 14, 23);

  autoTable(doc, {
    startY: 29,
    head: [["Employee", "Date", "Check In", "Check Out", "Duration", "Status", "Location"]],
    body: records.map((r) => [
      employeeName(r.employeeId),
      new Date(r.date).toLocaleDateString(),
      r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "—",
      r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "—",
      attendanceDuration(r) ?? "—",
      attendanceStatus(r),
      [r.checkInCity, r.checkInRegion].filter(Boolean).join(", ") || "—",
    ]),
    styles: { fontSize: 8 },
  });

  doc.save(`Attendance_${label}.pdf`);
}
