import { Router } from "express";
import { createRoleSchema, setRolePermissionSchema } from "@glampack/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const rolesRouter = Router();
rolesRouter.use(authenticate);

// Open to any authenticated employee — role names and their permission keys aren't
// sensitive, and the Employees / Roles & Permissions tabs need this list for their
// role-assignment dropdowns regardless of who's viewing.
rolesRouter.get("/", asyncHandler(controller.list));

rolesRouter.post("/", requirePermission("roles.manage"), validate(createRoleSchema), asyncHandler(controller.create));

rolesRouter.delete("/:name", requirePermission("roles.manage"), asyncHandler(controller.remove));

rolesRouter.patch(
  "/:name/permissions",
  requirePermission("roles.manage"),
  validate(setRolePermissionSchema),
  asyncHandler(controller.setPermission)
);
