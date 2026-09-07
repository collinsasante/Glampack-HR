import type { Request, Response } from "express";
import { hasPermission } from "../../lib/permissions.js";
import * as service from "./service.js";

const isStaff = (req: Request) => hasPermission(req.user!.role, "emergency_contacts.manage_any");

export async function list(req: Request, res: Response) {
  res.json(await service.listForEmployee(req.params.employeeId!));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await service.create(req.params.employeeId!, req.body));
}

export async function update(req: Request, res: Response) {
  res.json(await service.update(req.params.id!, { id: req.user!.id, isStaff: await isStaff(req) }, req.body));
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id!, { id: req.user!.id, isStaff: await isStaff(req) });
  res.status(204).send();
}
