import type { PermissionKey } from "@glampack/shared";
import { apiDelete, apiGet, apiPatch, apiPost } from "../apiClient";

export interface RoleWithPermissions {
  name: string;
  isSystem: boolean;
  employeeCount: number;
  permissions: string[];
}

export const listRoles = () => apiGet<RoleWithPermissions[]>("/roles");
export const createRole = (name: string) => apiPost<{ name: string }>("/roles", { name });
export const deleteRole = (name: string) => apiDelete<void>(`/roles/${encodeURIComponent(name)}`);
export const setRolePermission = (name: string, key: PermissionKey, granted: boolean) =>
  apiPatch<void>(`/roles/${encodeURIComponent(name)}/permissions`, { key, granted });
