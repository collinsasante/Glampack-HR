import type { Request, Response } from "express";
import { hasPermission } from "../../lib/permissions.js";
import * as service from "./service.js";

export async function create(req: Request, res: Response) {
  const leaveRequest = await service.createLeaveRequest(req.user!.id, req.body);
  res.status(201).json(leaveRequest);
}

export async function list(req: Request, res: Response) {
  const { employeeId, status } = req.query as { employeeId?: string; status?: string };
  const isStaff = await hasPermission(req.user!.role, "leave.view_all");
  const scopedEmployeeId = isStaff ? employeeId : req.user!.id;
  const leaveRequests = await service.listLeaveRequests({ employeeId: scopedEmployeeId, status });
  res.json(leaveRequests);
}

export async function approve(req: Request, res: Response) {
  const leaveRequest = await service.approveLeaveRequest(req.params.id!, req.user!.id);
  res.json(leaveRequest);
}

export async function reject(req: Request, res: Response) {
  const leaveRequest = await service.rejectLeaveRequest(req.params.id!, req.body.adminComments);
  res.json(leaveRequest);
}

export async function cancel(req: Request, res: Response) {
  const isStaff = await hasPermission(req.user!.role, "leave.view_all");
  const leaveRequest = await service.cancelLeaveRequest(
    req.params.id!,
    { id: req.user!.id, isStaff },
    req.body.adminComments
  );
  res.json(leaveRequest);
}
