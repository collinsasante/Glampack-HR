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
}

export const getMe = () => apiGet<Employee>("/employees/me");
export const getEmployee = (id: string) => apiGet<Employee>(`/employees/${id}`);
export const listEmployees = (params: { department?: string; role?: string } = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiGet<Employee[]>(`/employees${query ? `?${query}` : ""}`);
};
export const updateEmployee = (id: string, data: Record<string, unknown>) =>
  apiPatch<Employee>(`/employees/${id}`, data);
export const createEmployee = (data: Record<string, unknown>) => apiPost<Employee>("/employees", data);

export const isStaffRole = (role: Role) => role === "Admin" || role === "HR" || role === "Manager";
