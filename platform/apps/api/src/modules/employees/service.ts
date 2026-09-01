import type { CreateEmployeeInput, UpdateEmployeeAsStaffInput, UpdateOwnEmployeeInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { generateUniqueEmployeeId } from "../../lib/employeeId.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function listEmployees(filters: { department?: string; role?: string }) {
  return prisma.employee.findMany({
    where: {
      department: filters.department as any,
      role: filters.role as any,
    },
    orderBy: { fullName: "asc" },
  });
}

export async function getEmployeeById(id: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new HttpError(404, "Employee not found");
  return employee;
}

export async function createEmployee(input: CreateEmployeeInput) {
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

// Soft-delete: hard-deleting would cascade through 8 other tables' worth of history
// (attendance, leave requests, payroll, medical claims, ...). Deactivating preserves it.
export async function deactivateEmployee(id: string) {
  return prisma.employee.update({ where: { id }, data: { accountStatus: "Inactive" } });
}
