import type { Employee } from "@prisma/client";
import type { CreateEmployeeInput, Role, UpdateEmployeeAsStaffInput, UpdateOwnEmployeeInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { generateUniqueEmployeeId } from "../../lib/employeeId.js";
import { hasPermission } from "../../lib/permissions.js";
import { HttpError } from "../../middleware/errorHandler.js";

async function assertRealRole(name: string) {
  const role = await prisma.role.findUnique({ where: { name } });
  if (!role) throw new HttpError(400, `Unknown role "${name}"`);
}

// Every self-service page (leave, attendance, announcements, medical claims) needs
// to resolve other employees' names/departments for display — the old app's Worker
// let literally anyone list the full roster including salary/bank/SSN with zero
// server-side check at all. This keeps the list open to any authenticated employee
// (matching how the app actually behaved and is used) but nulls out sensitive fields
// for callers whose role lacks employees.view_sensitive.
export async function listEmployees(filters: { department?: string; role?: string }, viewerRole: string) {
  const employees = await prisma.employee.findMany({
    where: {
      department: filters.department as any,
      role: filters.role as any,
    },
    orderBy: { fullName: "asc" },
  });

  if (await hasPermission(viewerRole, "employees.view_sensitive")) return employees;

  return employees.map((e) => ({
    ...e,
    passwordLegacy: null,
    salary: null,
    dateOfBirth: null,
    phone: null,
    address: null,
    city: null,
    country: null,
    ghanaCardNumber: null,
    ssnitNumber: null,
    bankName: null,
    bankAccountNumber: null,
    bankBranch: null,
  }));
}

export async function getEmployeeById(id: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new HttpError(404, "Employee not found");
  return employee;
}

export async function createEmployee(input: CreateEmployeeInput) {
  await assertRealRole(input.role);
  const employeeId = await generateUniqueEmployeeId();
  return prisma.employee.create({
    data: {
      ...input,
      email: input.email.toLowerCase(),
      employeeId,
      accountStatus: "Active",
      annualLeaveBalance: 20,
    },
  });
}

export async function updateOwnEmployee(id: string, input: UpdateOwnEmployeeInput) {
  return prisma.employee.update({ where: { id }, data: input });
}

export async function updateEmployeeAsStaff(id: string, input: UpdateEmployeeAsStaffInput) {
  return prisma.employee.update({ where: { id }, data: input });
}

// Anyone with roles.assign_basic can assign roles (the Roles & Permissions tab), but
// without roles.assign_senior they can't touch an account whose CURRENT role holds
// senior permissions, nor grant a role that itself holds senior permissions — both
// directions of privilege escalation are blocked here, not just in the UI. Nobody
// (any role) can change their own role, to rule out an accidental self-lockout.
export async function updateEmployeeRole(actor: Employee, targetId: string, newRole: Role) {
  if (actor.id === targetId) {
    throw new HttpError(400, "You can't change your own role");
  }
  await assertRealRole(newRole);

  const target = await prisma.employee.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError(404, "Employee not found");

  if (!(await hasPermission(actor.role, "roles.assign_senior"))) {
    if (await hasPermission(target.role, "roles.assign_senior")) {
      throw new HttpError(403, "You can't change the role of an account with senior permissions");
    }
    if (await hasPermission(newRole, "roles.assign_senior")) {
      throw new HttpError(403, "You can't assign a role that holds senior permissions");
    }
  }

  return prisma.employee.update({ where: { id: targetId }, data: { role: newRole } });
}

// Soft-delete: hard-deleting would cascade through 8 other tables' worth of history
// (attendance, leave requests, payroll, medical claims, ...). Deactivating preserves it.
export async function deactivateEmployee(id: string) {
  return prisma.employee.update({ where: { id }, data: { accountStatus: "Inactive" } });
}
