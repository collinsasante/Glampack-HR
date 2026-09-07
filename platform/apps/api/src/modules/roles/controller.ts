import type { Request, Response } from "express";
import type { CreateRoleInput, PermissionKey, SetRolePermissionInput } from "@glampack/shared";
import * as rolesService from "./service.js";

export async function list(_req: Request, res: Response) {
  res.json(await rolesService.listRoles());
}

export async function create(req: Request, res: Response) {
  const { name } = req.body as CreateRoleInput;
  const role = await rolesService.createRole(name);
  res.status(201).json(role);
}

export async function remove(req: Request, res: Response) {
  await rolesService.deleteRole(req.params.name!);
  res.status(204).end();
}

export async function setPermission(req: Request, res: Response) {
  const { key, granted } = req.body as SetRolePermissionInput;
  await rolesService.setRolePermission(req.params.name!, key as PermissionKey, granted);
  res.status(204).end();
}
