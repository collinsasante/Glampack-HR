import { z } from "zod";
import { PAYMENT_METHODS, PAYROLL_STATUSES } from "../enums.js";

const customLineItemSchema = z.object({
  name: z.string().min(1),
  amount: z.number(),
  isRecurring: z.boolean().default(false),
  monthsRemaining: z.number().int().nonnegative().optional(),
  totalMonths: z.number().int().positive().optional(),
});

// Base inputs only — every total (totalAllowances, grossSalary, totalDeductions,
// netSalary, amountToPay) is computed server-side and must never be accepted from the client.
export const createPayrollSchema = z.object({
  employeeId: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM"),
  basicSalary: z.number().nonnegative(),
  housingAllowance: z.number().nonnegative().default(0),
  transportAllowance: z.number().nonnegative().default(0),
  benefits: z.number().nonnegative().default(0),
  otherAllowances: z.number().nonnegative().default(0),
  bonus: z.number().nonnegative().default(0),
  incomeTax: z.number().nonnegative().default(0),
  welfare: z.number().nonnegative().default(0),
  socialSecurity: z.number().nonnegative().default(0),
  healthInsurance: z.number().nonnegative().default(0),
  otherDeductions: z.number().nonnegative().default(0),
  customAllowances: z.array(customLineItemSchema).default([]),
  customDeductions: z.array(customLineItemSchema).default([]),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  periodStartDate: z.coerce.date().optional(),
  periodEndDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export type CreatePayrollInput = z.infer<typeof createPayrollSchema>;

export const updatePayrollSchema = createPayrollSchema.omit({ employeeId: true, month: true }).partial();
export type UpdatePayrollInput = z.infer<typeof updatePayrollSchema>;

export const processPayrollSchema = z.object({
  status: z.enum(PAYROLL_STATUSES),
  paymentDate: z.coerce.date().optional(),
});
export type ProcessPayrollInput = z.infer<typeof processPayrollSchema>;

export const listPayrollQuerySchema = z.object({
  employeeId: z.string().optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM")
    .optional(),
});
export type ListPayrollQuery = z.infer<typeof listPayrollQuerySchema>;
