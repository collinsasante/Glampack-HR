import { Router } from "express";
import {
  createPayrollSchema,
  listPayrollQuerySchema,
  processPayrollSchema,
  updatePayrollSchema,
} from "@glampack/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const payrollRouter = Router();

payrollRouter.use(authenticate);

payrollRouter.get("/", validate(listPayrollQuerySchema, "query"), asyncHandler(controller.list));

payrollRouter.post(
  "/",
  requirePermission("payroll.manage"),
  validate(createPayrollSchema),
  asyncHandler(controller.create)
);

payrollRouter.patch(
  "/:id",
  requirePermission("payroll.manage"),
  validate(updatePayrollSchema),
  asyncHandler(controller.update)
);

payrollRouter.patch(
  "/:id/process",
  requirePermission("payroll.manage"),
  validate(processPayrollSchema),
  asyncHandler(controller.process)
);

payrollRouter.delete("/:id", requirePermission("payroll.delete"), asyncHandler(controller.remove));
