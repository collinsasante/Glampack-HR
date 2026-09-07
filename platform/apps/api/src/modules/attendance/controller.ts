import type { Request, Response } from "express";
import { hasPermission } from "../../lib/permissions.js";
import * as service from "./service.js";

export async function checkIn(req: Request, res: Response) {
  const attendance = await service.checkIn(req.user!.id, req.body);
  res.status(201).json(attendance);
}

export async function checkOut(req: Request, res: Response) {
  const attendance = await service.checkOut(req.user!.id, req.body);
  res.json(attendance);
}

export async function list(req: Request, res: Response) {
  const isStaff = await hasPermission(req.user!.role, "attendance.view_all");
  // Already validated + coerced to Date by the `validate(listAttendanceQuerySchema, "query")`
  // middleware — an invalid date string never reaches here, it 400s at the middleware.
  const { employeeId, from, to } = req.query as unknown as { employeeId?: string; from?: Date; to?: Date };
  const scopedEmployeeId = isStaff ? employeeId : req.user!.id;
  const attendance = await service.listAttendance({ employeeId: scopedEmployeeId, from, to });
  res.json(attendance);
}
