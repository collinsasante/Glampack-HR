import type { CreatePayrollInput, ProcessPayrollInput, UpdatePayrollInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

interface Totals {
  totalAllowances: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  amountToPay: number;
}

// Every total here is derived server-side from base inputs — the live app today lets
// the client POST arbitrary totals directly, a real payroll-tampering vector this closes.
function computeTotals(
  input: Pick<
    CreatePayrollInput,
    | "basicSalary"
    | "housingAllowance"
    | "transportAllowance"
    | "benefits"
    | "otherAllowances"
    | "bonus"
    | "incomeTax"
    | "welfare"
    | "socialSecurity"
    | "healthInsurance"
    | "otherDeductions"
  > & { customAllowancesTotal: number; customDeductionsTotal: number }
): Totals {
  const totalAllowances =
    input.housingAllowance +
    input.transportAllowance +
    input.benefits +
    input.otherAllowances +
    input.bonus +
    input.customAllowancesTotal;
  const grossSalary = input.basicSalary + totalAllowances;

  const totalDeductions =
    input.incomeTax +
    input.welfare +
    input.socialSecurity +
    input.healthInsurance +
    input.otherDeductions +
    input.customDeductionsTotal;
  const netSalary = grossSalary - totalDeductions;

  // Matches admin.js: Amount to Pay = Net Salary + PAYE (Income Tax) + Social Security.
  const amountToPay = netSalary + input.incomeTax + input.socialSecurity;

  return { totalAllowances, grossSalary, totalDeductions, netSalary, amountToPay };
}

export async function createPayroll(input: CreatePayrollInput) {
  const customAllowancesTotal = input.customAllowances.reduce((sum, a) => sum + a.amount, 0);
  const customDeductionsTotal = input.customDeductions.reduce((sum, d) => sum + d.amount, 0);
  const totals = computeTotals({ ...input, customAllowancesTotal, customDeductionsTotal });

  return prisma.payroll.create({
    data: {
      employeeId: input.employeeId,
      month: input.month,
      basicSalary: input.basicSalary,
      housingAllowance: input.housingAllowance,
      transportAllowance: input.transportAllowance,
      benefits: input.benefits,
      otherAllowances: input.otherAllowances,
      bonus: input.bonus,
      incomeTax: input.incomeTax,
      welfare: input.welfare,
      socialSecurity: input.socialSecurity,
      healthInsurance: input.healthInsurance,
      otherDeductions: input.otherDeductions,
      paymentMethod: input.paymentMethod,
      periodStartDate: input.periodStartDate,
      periodEndDate: input.periodEndDate,
      notes: input.notes,
      ...totals,
      customAllowances: { create: input.customAllowances.map(({ name, amount, isRecurring, monthsRemaining, totalMonths }) => ({ name, amount, isRecurring, monthsRemaining, totalMonths })) },
      customDeductions: { create: input.customDeductions.map(({ name, amount, isRecurring, monthsRemaining, totalMonths }) => ({ name, amount, isRecurring, monthsRemaining, totalMonths })) },
    },
    include: { customAllowances: true, customDeductions: true },
  });
}

export async function updatePayroll(id: string, input: UpdatePayrollInput) {
  const existing = await prisma.payroll.findUnique({
    where: { id },
    include: { customAllowances: true, customDeductions: true },
  });
  if (!existing) throw new HttpError(404, "Payroll record not found");

  const merged = {
    basicSalary: input.basicSalary ?? Number(existing.basicSalary),
    housingAllowance: input.housingAllowance ?? Number(existing.housingAllowance),
    transportAllowance: input.transportAllowance ?? Number(existing.transportAllowance),
    benefits: input.benefits ?? Number(existing.benefits),
    otherAllowances: input.otherAllowances ?? Number(existing.otherAllowances),
    bonus: input.bonus ?? Number(existing.bonus),
    incomeTax: input.incomeTax ?? Number(existing.incomeTax),
    welfare: input.welfare ?? Number(existing.welfare),
    socialSecurity: input.socialSecurity ?? Number(existing.socialSecurity),
    healthInsurance: input.healthInsurance ?? Number(existing.healthInsurance),
    otherDeductions: input.otherDeductions ?? Number(existing.otherDeductions),
  };
  const customAllowances = input.customAllowances ?? existing.customAllowances;
  const customDeductions = input.customDeductions ?? existing.customDeductions;
  const customAllowancesTotal = customAllowances.reduce((sum, a) => sum + Number(a.amount), 0);
  const customDeductionsTotal = customDeductions.reduce((sum, d) => sum + Number(d.amount), 0);
  const totals = computeTotals({ ...merged, customAllowancesTotal, customDeductionsTotal });

  return prisma.$transaction(async (tx) => {
    if (input.customAllowances) {
      await tx.payrollCustomAllowance.deleteMany({ where: { payrollId: id } });
    }
    if (input.customDeductions) {
      await tx.payrollCustomDeduction.deleteMany({ where: { payrollId: id } });
    }

    return tx.payroll.update({
      where: { id },
      data: {
        ...merged,
        paymentMethod: input.paymentMethod,
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        notes: input.notes,
        ...totals,
        ...(input.customAllowances
          ? { customAllowances: { create: input.customAllowances.map(({ name, amount, isRecurring, monthsRemaining, totalMonths }) => ({ name, amount, isRecurring, monthsRemaining, totalMonths })) } }
          : {}),
        ...(input.customDeductions
          ? { customDeductions: { create: input.customDeductions.map(({ name, amount, isRecurring, monthsRemaining, totalMonths }) => ({ name, amount, isRecurring, monthsRemaining, totalMonths })) } }
          : {}),
      },
      include: { customAllowances: true, customDeductions: true },
    });
  });
}

export async function processPayroll(id: string, input: ProcessPayrollInput) {
  return prisma.payroll.update({
    where: { id },
    data: { status: input.status, paymentDate: input.paymentDate },
  });
}

export async function listPayroll(filters: { employeeId?: string; month?: string }) {
  return prisma.payroll.findMany({
    where: { employeeId: filters.employeeId, month: filters.month },
    include: { customAllowances: true, customDeductions: true },
    orderBy: { month: "desc" },
  });
}

export async function deletePayroll(id: string) {
  await prisma.payroll.delete({ where: { id } });
}
