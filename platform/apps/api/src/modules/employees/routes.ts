import { Router } from "express";
import { createEmployeeSchema, listEmployeesQuerySchema, updateRoleSchema } from "@glampack/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission, requireSelfOrPermission } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const employeesRouter = Router();

employeesRouter.use(authenticate);

employeesRouter.get("/me", asyncHandler(controller.getMe));

// Open to every authenticated employee — the service layer nulls out sensitive
// fields (salary, bank details, SSN, ...) for non-staff callers. Every self-service
// page (leave, attendance, announcements, medical claims) depends on this to resolve
// other employees' names for display.
employeesRouter.get(
  "/",
  validate(listEmployeesQuerySchema, "query"),
  asyncHandler(controller.list)
);

employeesRouter.get(
  "/:id",
  requireSelfOrPermission("employees.view_others", (req) => req.params.id!),
  asyncHandler(controller.getById)
);

employeesRouter.post(
  "/",
  requirePermission("employees.create"),
  validate(createEmployeeSchema),
  asyncHandler(controller.create)
);

employeesRouter.patch(
  "/:id",
  requireSelfOrPermission("employees.edit_others", (req) => req.params.id!),
  asyncHandler(controller.update)
);

// Dedicated, narrower endpoint for the Roles & Permissions tab — lets anyone with
// roles.assign_basic change roles (with senior-role restrictions enforced in the
// service layer) without granting the broader staff-edit access the route above has
// (salary, bank, ...).
employeesRouter.patch(
  "/:id/role",
  requirePermission("roles.assign_basic"),
  validate(updateRoleSchema),
  asyncHandler(controller.updateRole)
);

employeesRouter.delete("/:id", requirePermission("employees.deactivate"), asyncHandler(controller.deactivate));
