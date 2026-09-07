import type { Request, Response } from "express";
import { updateEmployeeAsStaffSchema, updateOwnEmployeeSchema, type UpdateRoleInput } from "@glampack/shared";
import { getRolePermissions, hasPermission } from "../../lib/permissions.js";
import * as employeesService from "./service.js";

export async function list(req: Request, res: Response) {
  const { department, role } = req.query as { department?: string; role?: string };
  const employees = await employeesService.listEmployees({ department, role }, req.user!.role);
  res.json(employees);
}

export async function getById(req: Request, res: Response) {
  const employee = await employeesService.getEmployeeById(req.params.id!);
  res.json(employee);
}

// Ships the resolved permission set alongside the employee record so the frontend
// can gate every bit of staff-only UI (nav visibility, action buttons, page access)
// from one real, server-computed list instead of hardcoding role names anywhere.
export async function getMe(req: Request, res: Response) {
  const permissions = Array.from(await getRolePermissions(req.user!.role));
  res.json({ ...req.user, permissions });
}

export async function create(req: Request, res: Response) {
  const employee = await employeesService.createEmployee(req.body);
  res.status(201).json(employee);
}

// The permitted field set differs by role, so validation happens here rather than
// via the generic `validate()` route middleware (which can't see req.user yet).
export async function update(req: Request, res: Response) {
  const isStaff = await hasPermission(req.user!.role, "employees.edit_others");
  const schema = isStaff ? updateEmployeeAsStaffSchema : updateOwnEmployeeSchema;
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Validation failed", details: result.error.flatten() });
  }

  const employee = isStaff
    ? await employeesService.updateEmployeeAsStaff(req.params.id!, result.data)
    : await employeesService.updateOwnEmployee(req.params.id!, result.data);
  res.json(employee);
}

export async function updateRole(req: Request, res: Response) {
  const { role } = req.body as UpdateRoleInput;
  const employee = await employeesService.updateEmployeeRole(req.user!, req.params.id!, role);
  res.json(employee);
}

export async function deactivate(req: Request, res: Response) {
  const employee = await employeesService.deactivateEmployee(req.params.id!);
  res.json(employee);
}
