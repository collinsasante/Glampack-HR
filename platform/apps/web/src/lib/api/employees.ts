import type { AccountStatus, Department, EmployeeStatus, EmploymentType, Role } from "@glampack/shared";
import { apiGet, apiPatch, apiPost } from "../apiClient";

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  role: Role;
  status: EmployeeStatus;
  accountStatus: AccountStatus;
  employmentType: EmploymentType | null;
  department: Department | null;
  jobTitle: string | null;
  annualLeaveBalance: number;
  salary: string | null;
  dateOfBirth: string | null;
  joiningDate: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  ghanaCardNumber: string | null;
  ssnitNumber: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankBranch: string | null;
  /** Only present on the /me response — the current viewer's resolved permission keys. */
  permissions?: string[];
}

export const getMe = () => apiGet<Employee>("/employees/me");
export const getEmployee = (id: string) => apiGet<Employee>(`/employees/${id}`);
export const listEmployees = (params: { department?: string; role?: string } = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiGet<Employee[]>(`/employees${query ? `?${query}` : ""}`);
};
export const updateEmployee = (id: string, data: Record<string, unknown>) =>
  apiPatch<Employee>(`/employees/${id}`, data);
export const updateEmployeeRole = (id: string, role: Role) =>
  apiPatch<Employee>(`/employees/${id}/role`, { role });
export const createEmployee = (data: Record<string, unknown>) => apiPost<Employee>("/employees", data);

// Any role holding at least one real permission counts as "staff" for nav/access
// gating — this is what makes the check work for a brand-new custom role too,
// without hardcoding role names anywhere on the frontend.
export const isStaffRole = (employee: Pick<Employee, "permissions">) => (employee.permissions?.length ?? 0) > 0;

export const hasPermission = (employee: Pick<Employee, "permissions">, key: string) =>
  employee.permissions?.includes(key) ?? false;
