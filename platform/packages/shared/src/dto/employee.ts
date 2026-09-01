import { z } from "zod";
import {
  ACCOUNT_STATUSES,
  DEPARTMENTS,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  ROLES,
} from "../enums.js";

export const createEmployeeSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(ROLES).default("Employee"),
  status: z.enum(EMPLOYEE_STATUSES),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  department: z.enum(DEPARTMENTS).optional(),
  jobTitle: z.string().optional(),
  salary: z.number().nonnegative().optional(),
  dateOfBirth: z.coerce.date().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  ghanaCardNumber: z.string().optional(),
  ssnitNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
  joiningDate: z.coerce.date().optional(),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

// Fields an employee may edit on their own record.
export const updateOwnEmployeeSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  ghanaCardNumber: z.string().optional(),
  ssnitNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
});
export type UpdateOwnEmployeeInput = z.infer<typeof updateOwnEmployeeSchema>;

// Additional fields only HR/Admin may edit.
// Self-service signup: email/role/status/accountStatus/annualLeaveBalance are all
// server-set (from the verified Firebase token or Default Values in CLAUDE.md) —
// never accepted from the client here, unlike the staff-only createEmployeeSchema.
export const signUpSchema = z.object({
  fullName: z.string().min(1),
  department: z.enum(DEPARTMENTS).optional(),
  jobTitle: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  phone: z.string().optional(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const listEmployeesQuerySchema = z.object({
  department: z.enum(DEPARTMENTS).optional(),
  role: z.enum(ROLES).optional(),
});
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;

export const updateEmployeeAsStaffSchema = updateOwnEmployeeSchema.extend({
  fullName: z.string().min(1).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  accountStatus: z.enum(ACCOUNT_STATUSES).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  department: z.enum(DEPARTMENTS).optional(),
  jobTitle: z.string().optional(),
  salary: z.number().nonnegative().optional(),
  annualLeaveBalance: z.number().int().min(0).optional(),
  dateOfBirth: z.coerce.date().optional(),
  joiningDate: z.coerce.date().optional(),
});
export type UpdateEmployeeAsStaffInput = z.infer<typeof updateEmployeeAsStaffSchema>;
