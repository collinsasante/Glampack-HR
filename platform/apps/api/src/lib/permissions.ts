import type { PermissionKey } from "@glampack/shared";
import { prisma } from "./prisma.js";

// Small HR-scale app, real-time correctness matters more than shaving a query per
// request — no caching here. A role change or permission toggle takes effect on
// the very next request, not after some TTL expires.
export async function getRolePermissions(roleName: string): Promise<Set<string>> {
  const rows = await prisma.rolePermission.findMany({ where: { roleName }, select: { permissionKey: true } });
  return new Set(rows.map((r) => r.permissionKey));
}

export async function hasPermission(roleName: string, key: PermissionKey): Promise<boolean> {
  const count = await prisma.rolePermission.count({ where: { roleName, permissionKey: key } });
  return count > 0;
}
