import { Router } from "express";
import { createEmployeeSchema, listEmployeesQuerySchema } from "@glampack/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole, requireSelfOrRole } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const employeesRouter = Router();

employeesRouter.use(authenticate);

employeesRouter.get("/me", asyncHandler(controller.getMe));

employeesRouter.get(
  "/",
  requireRole(["Admin", "HR", "Manager"]),
  validate(listEmployeesQuerySchema, "query"),
  asyncHandler(controller.list)
);

employeesRouter.get(
  "/:id",
  requireSelfOrRole(["Admin", "HR", "Manager"], (req) => req.params.id!),
  asyncHandler(controller.getById)
);

employeesRouter.post(
  "/",
  requireRole(["Admin", "HR"]),
  validate(createEmployeeSchema),
  asyncHandler(controller.create)
);

employeesRouter.patch(
  "/:id",
  requireSelfOrRole(["Admin", "HR"], (req) => req.params.id!),
  asyncHandler(controller.update)
);

employeesRouter.delete("/:id", requireRole(["Admin"]), asyncHandler(controller.deactivate));
