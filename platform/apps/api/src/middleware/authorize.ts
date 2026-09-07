import type { NextFunction, Request, Response } from "express";
import type { PermissionKey } from "@glampack/shared";
import { hasPermission } from "../lib/permissions.js";

export function requirePermission(key: PermissionKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!(await hasPermission(req.user.role, key))) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  };
}

/**
 * Allows the request through if the authenticated user is acting on their own
 * record (per `getEmployeeId(req)`), or their role holds `key`.
 */
export function requireSelfOrPermission(key: PermissionKey, getEmployeeId: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const isSelf = getEmployeeId(req) === req.user.id;
    if (!isSelf && !(await hasPermission(req.user.role, key))) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  };
}
