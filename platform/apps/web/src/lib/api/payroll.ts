import type {
  CreatePayrollInput,
  PaymentMethod,
  PayrollStatus,
  ProcessPayrollInput,
  UpdatePayrollInput,
} from "@glampack/shared";
import { apiDelete, apiGet, apiPatch, apiPost } from "../apiClient";

export interface PayrollCustomLine {
  id: string;
  name: string;
  amount: string;
  isRecurring: boolean;
  monthsRemaining: number | null;
  totalMonths: number | null;
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: string;
  basicSalary: string;
  housingAllowance: string;
  transportAllowance: string;
  benefits: string;
  otherAllowances: string;
  bonus: string;
  totalAllowances: string;
  grossSalary: string;
  incomeTax: string;
  welfare: string;
  socialSecurity: string;
  healthInsurance: string;
  otherDeductions: string;
  totalDeductions: string;
  netSalary: string;
  amountToPay: string;
  status: PayrollStatus;
  paymentMethod: PaymentMethod | null;
  paymentDate: string | null;
  periodStartDate: string | null;
  periodEndDate: string | null;
  notes: string | null;
  customAllowances: PayrollCustomLine[];
  customDeductions: PayrollCustomLine[];
}

export const listPayroll = (params: { employeeId?: string; month?: string } = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiGet<Payroll[]>(`/payroll${query ? `?${query}` : ""}`);
};

export const createPayroll = (data: CreatePayrollInput) => apiPost<Payroll>("/payroll", data);
export const updatePayroll = (id: string, data: UpdatePayrollInput) => apiPatch<Payroll>(`/payroll/${id}`, data);
export const processPayroll = (id: string, data: ProcessPayrollInput) =>
  apiPatch<Payroll>(`/payroll/${id}/process`, data);
export const deletePayroll = (id: string) => apiDelete(`/payroll/${id}`);
