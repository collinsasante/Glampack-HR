import type { Request, Response } from "express";
import { hasPermission } from "../../lib/permissions.js";
import * as service from "./service.js";

export async function list(req: Request, res: Response) {
  const isStaff = await hasPermission(req.user!.role, "medical_claims.view_all");
  const { employeeId, status } = req.query as { employeeId?: string; status?: string };
  const scopedEmployeeId = isStaff ? employeeId : req.user!.id;
  res.json(await service.listMedicalClaims({ employeeId: scopedEmployeeId, status }));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await service.createMedicalClaim(req.user!.id, req.body));
}

export async function approve(req: Request, res: Response) {
  res.json(await service.approveMedicalClaim(req.params.id!, req.body));
}

export async function reject(req: Request, res: Response) {
  res.json(await service.rejectMedicalClaim(req.params.id!, req.body));
}
