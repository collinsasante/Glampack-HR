import type { CreateLeaveRequestInput, LeaveStatus, LeaveType } from "@glampack/shared";
import { apiGet, apiPatch, apiPost } from "../apiClient";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: LeaveStatus;
  notes: string | null;
  adminComments: string | null;
  approvedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export const listLeaveRequests = (params: { employeeId?: string; status?: string } = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiGet<LeaveRequest[]>(`/leave-requests${query ? `?${query}` : ""}`);
};

export const createLeaveRequest = (data: CreateLeaveRequestInput) =>
  apiPost<LeaveRequest>("/leave-requests", data);

export const approveLeaveRequest = (id: string) => apiPatch<LeaveRequest>(`/leave-requests/${id}/approve`);
export const rejectLeaveRequest = (id: string, adminComments: string) =>
  apiPatch<LeaveRequest>(`/leave-requests/${id}/reject`, { adminComments });
export const cancelLeaveRequest = (id: string, adminComments: string) =>
  apiPatch<LeaveRequest>(`/leave-requests/${id}/cancel`, { adminComments });
