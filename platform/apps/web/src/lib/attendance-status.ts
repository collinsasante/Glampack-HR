import type { AttendanceRecord } from "./api/attendance";

export type AttendanceStatus = "Present" | "Late" | "Incomplete";

// "Late" comes solely from the real lateReason field, set when an employee checks
// in after their shift's late threshold (see SHIFT_LATE_THRESHOLDS in
// today-attendance-card.tsx) and fills in the late-reason prompt.
// "Incomplete" means checked in but not yet checked out — never "Absent",
// since the record existing at all means the employee did check in.
export function attendanceStatus(record: AttendanceRecord): AttendanceStatus {
  if (record.lateReason) return "Late";
  if (record.checkInTime && !record.checkOutTime) return "Incomplete";
  return "Present";
}

export function attendanceStatusVariant(status: AttendanceStatus): "success" | "warning" | "secondary" {
  if (status === "Present") return "success";
  if (status === "Late") return "warning";
  return "secondary";
}

export function attendanceDuration(record: AttendanceRecord): string | null {
  if (!record.checkInTime || !record.checkOutTime) return null;
  const ms = new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime();
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

export function attendanceDurationMinutes(record: AttendanceRecord): number {
  if (!record.checkInTime || !record.checkOutTime) return 0;
  const ms = new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime();
  return ms > 0 ? Math.floor(ms / 60000) : 0;
}
