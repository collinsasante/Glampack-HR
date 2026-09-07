import { z } from "zod";
import {
  ACCOUNT_STATUSES,
  DEPARTMENTS,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
} from "../enums.js";

// Roles are dynamic (see the Role table) — validated against real rows at the
// service layer, not against a fixed compile-time list.
const roleNameSchema = z.string().min(1);

export const createEmployeeSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  role: roleNameSchema.default("Employee"),
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

// Narrow, dedicated schema for the Roles & Permissions tab — deliberately doesn't
// accept any of the other staff-editable fields (salary, bank details, ...), since
// Manager is allowed to call this endpoint but not the general staff-edit one.
export const updateRoleSchema = z.object({
  role: roleNameSchema,
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const listEmployeesQuerySchema = z.object({
  department: z.enum(DEPARTMENTS).optional(),
  role: roleNameSchema.optional(),
});
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;

// role is deliberately NOT accepted here — it must go through the dedicated
// PATCH /:id/role endpoint (updateRoleSchema above), which is the only path that
// enforces the senior-role escalation guards. Accepting it here too would let
// anyone with employees.edit_others bypass those guards entirely.
export const updateEmployeeAsStaffSchema = updateOwnEmployeeSchema.extend({
  fullName: z.string().min(1).optional(),
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
