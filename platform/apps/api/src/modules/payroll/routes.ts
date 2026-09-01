import { Router } from "express";
import {
  createPayrollSchema,
  listPayrollQuerySchema,
  processPayrollSchema,
  updatePayrollSchema,
} from "@glampack/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const payrollRouter = Router();

payrollRouter.use(authenticate);

payrollRouter.get("/", validate(listPayrollQuerySchema, "query"), asyncHandler(controller.list));

payrollRouter.post(
  "/",
  requireRole(["Admin", "HR"]),
  validate(createPayrollSchema),
  asyncHandler(controller.create)
);

payrollRouter.patch(
  "/:id",
  requireRole(["Admin", "HR"]),
  validate(updatePayrollSchema),
  asyncHandler(controller.update)
);

payrollRouter.patch(
  "/:id/process",
  requireRole(["Admin", "HR"]),
  validate(processPayrollSchema),
  asyncHandler(controller.process)
);

payrollRouter.delete("/:id", requireRole(["Admin"]), asyncHandler(controller.remove));
