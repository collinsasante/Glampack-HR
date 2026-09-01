import type { NextFunction, Request, Response } from "express";
import type { Role } from "@glampack/shared";

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role as Role)) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  };
}

/**
 * Allows the request through if the authenticated user is acting on their own
 * record (per `getEmployeeId(req)`), or holds one of `staffRoles`.
 */
export function requireSelfOrRole(staffRoles: Role[], getEmployeeId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const isSelf = getEmployeeId(req) === req.user.id;
    const isStaff = staffRoles.includes(req.user.role as Role);
    if (!isSelf && !isStaff) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  };
}
