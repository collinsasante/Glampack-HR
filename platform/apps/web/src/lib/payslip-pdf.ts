import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Employee } from "./api/employees";
import type { Payroll } from "./api/payroll";

// Simplified successor to payroll.html's downloadPayslip — same core numbers and
// breakdown, without the old version's hardcoded logo/company letterhead assets.
function buildPayslipDoc(payroll: Payroll, employee: Employee) {
  const doc = new jsPDF("p", "mm", "a4");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Glampack HR", 20, 18);

  doc.setFontSize(11);
  doc.text(`Payslip — ${payroll.month}`, 20, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Employee: ${employee.fullName} (${employee.employeeId})`, 20, 36);
  doc.text(`Department: ${employee.department ?? "-"}`, 20, 41);
  doc.text(`Status: ${payroll.status}`, 20, 46);

  autoTable(doc, {
    startY: 54,
    head: [["Allowances", "Amount (GH₵)"]],
    body: [
      ["Basic Salary", payroll.basicSalary],
      ["Housing Allowance", payroll.housingAllowance],
      ["Transport Allowance", payroll.transportAllowance],
      ["Benefits", payroll.benefits],
      ["Other Allowances", payroll.otherAllowances],
      ["Bonus", payroll.bonus],
      ...payroll.customAllowances.map((a) => [a.name, a.amount]),
      ["Total Allowances", payroll.totalAllowances],
      ["Gross Salary", payroll.grossSalary],
    ],
  });

  const afterAllowances = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, {
    startY: afterAllowances + 6,
    head: [["Deductions", "Amount (GH₵)"]],
    body: [
      ["Income Tax (PAYE)", payroll.incomeTax],
      ["Welfare", payroll.welfare],
      ["Social Security", payroll.socialSecurity],
      ["Health Insurance", payroll.healthInsurance],
      ["Other Deductions", payroll.otherDeductions],
      ...payroll.customDeductions.map((d) => [d.name, d.amount]),
      ["Total Deductions", payroll.totalDeductions],
    ],
  });

  const afterDeductions = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Net Salary: GH₵${payroll.netSalary}`, 20, afterDeductions + 12);
  doc.text(`Amount to Pay: GH₵${payroll.amountToPay}`, 20, afterDeductions + 19);

  return doc;
}

export function downloadPayslip(payroll: Payroll, employee: Employee) {
  const doc = buildPayslipDoc(payroll, employee);
  doc.save(`Payslip_${employee.employeeId}_${payroll.month}.pdf`);
}

export function previewPayslip(payroll: Payroll, employee: Employee) {
  const doc = buildPayslipDoc(payroll, employee);
  window.open(doc.output("bloburl"), "_blank");
}
