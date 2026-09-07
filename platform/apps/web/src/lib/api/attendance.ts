import type { CheckInInput, CheckOutInput, Shift } from "@glampack/shared";
import { apiGet, apiPost } from "../apiClient";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInCity: string | null;
  checkInRegion: string | null;
  checkInOfficeId: string | null;
  checkInOffice: { id: string; name: string } | null;
  checkInDistanceFromOfficeM: string | null;
  checkOutCity: string | null;
  checkOutRegion: string | null;
  checkOutOfficeId: string | null;
  checkOutOffice: { id: string; name: string } | null;
  checkOutDistanceFromOfficeM: string | null;
  shift: Shift;
  lateReason: string | null;
}

export const listAttendance = (params: { employeeId?: string; from?: string; to?: string } = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiGet<AttendanceRecord[]>(`/attendance${query ? `?${query}` : ""}`);
};

export const checkIn = (data: CheckInInput) => apiPost<AttendanceRecord>("/attendance/check-in", data);
export const checkOut = (data: CheckOutInput = {}) => apiPost<AttendanceRecord>("/attendance/check-out", data);
