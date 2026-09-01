import { z } from "zod";
import { LEAVE_STATUSES, LEAVE_TYPES } from "../enums.js";

export const createLeaveRequestSchema = z.object({
  leaveType: z.enum(LEAVE_TYPES),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().optional(),
});
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const rejectLeaveRequestSchema = z.object({
  adminComments: z.string().min(1),
});
export type RejectLeaveRequestInput = z.infer<typeof rejectLeaveRequestSchema>;

export const cancelLeaveRequestSchema = z.object({
  adminComments: z.string().min(1),
});
export type CancelLeaveRequestInput = z.infer<typeof cancelLeaveRequestSchema>;

export const listLeaveRequestsQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.enum(LEAVE_STATUSES).optional(),
});
export type ListLeaveRequestsQuery = z.infer<typeof listLeaveRequestsQuerySchema>;
