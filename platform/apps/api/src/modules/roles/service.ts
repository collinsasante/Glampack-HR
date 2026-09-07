import type { PermissionKey } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function listRoles() {
  const roles = await prisma.role.findMany({
    include: { permissions: true, _count: { select: { employees: true } } },
    orderBy: { name: "asc" },
  });
  return roles.map((r) => ({
    name: r.name,
    isSystem: r.isSystem,
    employeeCount: r._count.employees,
    permissions: r.permissions.map((p) => p.permissionKey),
  }));
}

export async function createRole(name: string) {
  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) throw new HttpError(409, "A role with this name already exists");
  // Starts with zero permissions — an admin opts each one in explicitly rather
  // than a new role silently inheriting capabilities nobody reviewed.
  return prisma.role.create({ data: { name, isSystem: false } });
}

export async function deleteRole(name: string) {
  const role = await prisma.role.findUnique({ where: { name }, include: { _count: { select: { employees: true } } } });
  if (!role) throw new HttpError(404, "Role not found");
  if (role._count.employees > 0) {
    throw new HttpError(409, "Reassign every employee off this role before deleting it");
  }
  const rolesWithManage = await prisma.rolePermission.findMany({
    where: { permissionKey: "roles.manage" },
    select: { roleName: true },
  });
  const isOnlyManager =
    rolesWithManage.length === 1 && rolesWithManage[0]!.roleName === name;
  if (isOnlyManager) {
    throw new HttpError(400, "Can't delete the only role that can manage roles & permissions");
  }
  await prisma.role.delete({ where: { name } });
}

export async function setRolePermission(roleName: string, key: PermissionKey, granted: boolean) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw new HttpError(404, "Role not found");

  if (key === "roles.manage" && !granted) {
    const rolesWithManage = await prisma.rolePermission.findMany({
      where: { permissionKey: "roles.manage" },
      select: { roleName: true },
    });
    const isOnlyManager = rolesWithManage.length === 1 && rolesWithManage[0]!.roleName === roleName;
    if (isOnlyManager) {
      throw new HttpError(400, "Can't remove the only role that can manage roles & permissions");
    }
  }

  if (granted) {
    await prisma.rolePermission.upsert({
      where: { roleName_permissionKey: { roleName, permissionKey: key } },
      create: { roleName, permissionKey: key },
      update: {},
    });
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleName, permissionKey: key } });
  }
}
