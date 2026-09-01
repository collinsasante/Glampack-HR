import jsPDF from "jspdf";
import { humanize } from "./format";
import type { Employee } from "./api/employees";
import type { Payroll } from "./api/payroll";

// Exact recreation of the old app's downloadPayslip() (techzaa.in/techauth/assets/js/admin.js) —
// same coordinates, colors, fonts, and section layout, driven by real data throughout.
// The old app hardcoded Payment Method as "Bank Transfer"; the new schema has a real
// paymentMethod field, so that's used when set (falling back to the old default otherwise).

const COMPANY_NAME = "Packaging Glamour (BN491412019)";
const COMPANY_ADDRESS_LINES = ["Off Oyarifa Road", "Accra", "https://packglamour.com", "help@packglamour.com", "Tel: 0308251169"];

function formatCurrency(amount: number | string) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return "GHS " + n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function periodLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// The source logo is 1930×457px; embedded at its native resolution jsPDF
// stores it as ~3.5MB of raw pixel data even though it's drawn at 30×7mm.
// Downscaling to real print resolution first (same visual result — nobody
// can see pixels finer than ~300dpi on paper) keeps the output PDF small.
async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("/logo.png");
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);

    const targetWidthPx = 400; // ~300dpi at 30mm wide
    const targetHeightPx = Math.round((bitmap.height / bitmap.width) * targetWidthPx);
    const canvas = document.createElement("canvas");
    canvas.width = targetWidthPx;
    canvas.height = targetHeightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, targetWidthPx, targetHeightPx);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function buildPayslipDoc(payroll: Payroll, employee: Employee) {
  const doc = new jsPDF("p", "mm", "a4");

  // ============ HEADER — COMPANY INFO ============
  const logo = await loadLogoBase64();
  if (logo) doc.addImage(logo, "PNG", 20, 12, 30, 7);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_NAME, 190, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  COMPANY_ADDRESS_LINES.forEach((line, i) => doc.text(line, 190, 20 + i * 4, { align: "right" }));

  // ============ TITLE ============
  const period = periodLabel(payroll.month);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`Payslip for Period Ending ${period} (GHS)`, 105, 52, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Monthly", 105, 58, { align: "center" });

  // ============ EMPLOYEE INFO BOX ============
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 65, 170, 70, "F");

  function field(x: number, y: number, label: string, value: string) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(value || "-", x, y + 4);
  }

  let y = 70;
  field(25, y, "Employee Name", employee.fullName);
  y += 10;
  field(25, y, "Telephone", employee.phone ?? "-");
  y += 10;
  field(25, y, "Email", employee.email);
  y += 10;
  field(25, y, "Social Security Number", employee.ssnitNumber ?? "-");
  y += 10;
  field(25, y, "GH Card", employee.ghanaCardNumber ?? "-");
  y += 10;
  field(25, y, "Bank Name", employee.bankName ?? "-");
  y += 10;
  field(25, y, "Account Number", employee.bankAccountNumber ?? "-");

  y = 70;
  field(110, y, "STAFF ID", employee.employeeId);
  y += 10;
  field(110, y, "Dept", employee.department ? humanize(employee.department) : "-");
  y += 10;
  field(110, y, "Position", employee.jobTitle ?? "-");
  y += 10;
  field(110, y, "Location", employee.city || "Accra");
  y += 10;
  field(110, y, "Payment Date", payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : "Not specified");
  y += 10;
  field(110, y, "Payment Method", payroll.paymentMethod ? humanize(payroll.paymentMethod) : "Bank Transfer");

  // ============ SALARY BREAKDOWN ============
  y = 147;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Basic Salary", 25, y);
  doc.text(formatCurrency(payroll.basicSalary), 185, y, { align: "right" });

  const earnings = [
    ["Housing Allowance", payroll.housingAllowance],
    ["Transport Allowance", payroll.transportAllowance],
    ["Benefits", payroll.benefits],
    ["Other Allowances", payroll.otherAllowances],
    ["Bonus", payroll.bonus],
    ...payroll.customAllowances.map((a) => [a.name, a.amount]),
  ].filter(([, amount]) => Number(amount) > 0) as [string, string][];

  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(77, 124, 255);
  doc.text("+", 25, y);
  doc.setTextColor(0, 0, 0);
  doc.text(`Earning (${earnings.length})`, 32, y);
  doc.text(formatCurrency(payroll.totalAllowances), 185, y, { align: "right" });

  y += 4;
  doc.setFillColor(250, 250, 250);
  doc.rect(30, y, 160, Math.max(earnings.length, 1) * 7, "F");
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  for (const [label, amount] of earnings) {
    doc.text(label, 35, y);
    doc.text(formatCurrency(amount), 180, y, { align: "right" });
    y += 7;
  }
  if (earnings.length === 0) y += 7;

  const deductions = [
    ["Income Tax (PAYE)", payroll.incomeTax],
    ["Welfare", payroll.welfare],
    ["Social Security", payroll.socialSecurity],
    ["Health Insurance", payroll.healthInsurance],
    ["Other Deductions", payroll.otherDeductions],
    ...payroll.customDeductions.map((d) => [d.name, d.amount]),
  ].filter(([, amount]) => Number(amount) > 0) as [string, string][];

  y += 3;
  doc.setFontSize(10);
  doc.setTextColor(77, 124, 255);
  doc.text("-", 25, y);
  doc.setTextColor(0, 0, 0);
  doc.text(`Deduction (${deductions.length})`, 32, y);
  doc.setTextColor(220, 38, 38);
  doc.text(`(${formatCurrency(payroll.totalDeductions)})`, 185, y, { align: "right" });

  y += 4;
  doc.setFillColor(250, 250, 250);
  doc.rect(30, y, 160, Math.max(deductions.length, 1) * 7, "F");
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  for (const [label, amount] of deductions) {
    doc.text(label, 35, y);
    doc.text(formatCurrency(amount), 180, y, { align: "right" });
    y += 7;
  }
  if (deductions.length === 0) y += 7;

  // ============ NET SALARY ============
  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, 190, y);
  y += 7;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Net Salary", 25, y);
  doc.text(formatCurrency(payroll.netSalary), 185, y, { align: "right" });

  // ============ FOOTER ============
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("This is a computer-generated payslip and does not require a signature.", 105, 285, { align: "center" });

  return { doc, period };
}

export async function downloadPayslip(payroll: Payroll, employee: Employee) {
  const { doc, period } = await buildPayslipDoc(payroll, employee);
  doc.save(`Payslip_${period}_${employee.fullName.replace(/\s+/g, "_")}.pdf`);
}

export async function previewPayslip(payroll: Payroll, employee: Employee) {
  // Open the tab synchronously (within the click handler's call stack) so
  // browsers don't treat it as an unsolicited popup once the async PDF build
  // (logo fetch) resolves — then navigate it once the blob URL is ready.
  const win = window.open("", "_blank");
  const { doc } = await buildPayslipDoc(payroll, employee);
  const blobUrl = doc.output("bloburl");
  if (win) win.location.href = String(blobUrl);
  else window.open(blobUrl, "_blank");
}
