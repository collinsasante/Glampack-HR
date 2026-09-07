import type { Request, Response } from "express";
import { hasPermission } from "../../lib/permissions.js";
import * as service from "./service.js";

export async function list(req: Request, res: Response) {
  const isStaff = await hasPermission(req.user!.role, "payroll.view_all");
  const { employeeId, month } = req.query as { employeeId?: string; month?: string };
  const scopedEmployeeId = isStaff ? employeeId : req.user!.id;
  res.json(await service.listPayroll({ employeeId: scopedEmployeeId, month }));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await service.createPayroll(req.body));
}

export async function update(req: Request, res: Response) {
  res.json(await service.updatePayroll(req.params.id!, req.body));
}

export async function process(req: Request, res: Response) {
  res.json(await service.processPayroll(req.params.id!, req.body));
}

export async function remove(req: Request, res: Response) {
  await service.deletePayroll(req.params.id!);
  res.status(204).send();
}
