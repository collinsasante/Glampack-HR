import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { currency } from "./format";
import type { MedicalClaim } from "./api/medical-claims";
import type { Employee } from "./api/employees";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// Real client-side export — no backend export endpoint exists, and none is
// needed for a file built entirely from data the page already has in hand.
export function exportMedicalClaimsCsv(claims: MedicalClaim[], employees: Employee[], label: string) {
  const employeeName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? id;
  const headers = ["Employee", "Clinic/Hospital", "Visit Date", "Treatment", "Amount (GHS)", "Status", "Submitted", "Admin Notes"];
  const rows = claims.map((c) => [
    employeeName(c.employeeId),
    c.hospitalClinicName,
    new Date(c.dateOfVisit).toLocaleDateString(),
    c.descriptionOfTreatment,
    c.amountSpent,
    c.status,
    new Date(c.createdAt).toLocaleDateString(),
    c.adminNotes ?? "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `MedicalClaims_${label}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportMedicalClaimsPdf(claims: MedicalClaim[], employees: Employee[], label: string) {
  const employeeName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? id;
  const doc = new jsPDF("l", "mm", "a4");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Glampack HR — Medical Claims Report", 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Scope: ${label}`, 14, 23);

  autoTable(doc, {
    startY: 29,
    head: [["Employee", "Clinic/Hospital", "Visit Date", "Amount", "Status", "Submitted"]],
    body: claims.map((c) => [
      employeeName(c.employeeId),
      c.hospitalClinicName,
      new Date(c.dateOfVisit).toLocaleDateString(),
      currency(Number(c.amountSpent)),
      c.status,
      new Date(c.createdAt).toLocaleDateString(),
    ]),
    styles: { fontSize: 8 },
  });

  doc.save(`MedicalClaims_${label}.pdf`);
}
