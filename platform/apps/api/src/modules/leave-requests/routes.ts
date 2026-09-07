import { Router } from "express";
import {
  cancelLeaveRequestSchema,
  createLeaveRequestSchema,
  listLeaveRequestsQuerySchema,
  rejectLeaveRequestSchema,
} from "@glampack/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const leaveRequestsRouter = Router();

leaveRequestsRouter.use(authenticate);

leaveRequestsRouter.get("/", validate(listLeaveRequestsQuerySchema, "query"), asyncHandler(controller.list));

leaveRequestsRouter.post("/", validate(createLeaveRequestSchema), asyncHandler(controller.create));

leaveRequestsRouter.patch(
  "/:id/approve",
  requirePermission("leave.approve"),
  asyncHandler(controller.approve)
);

leaveRequestsRouter.patch(
  "/:id/reject",
  requirePermission("leave.approve"),
  validate(rejectLeaveRequestSchema),
  asyncHandler(controller.reject)
);

leaveRequestsRouter.patch(
  "/:id/cancel",
  validate(cancelLeaveRequestSchema),
  asyncHandler(controller.cancel)
);
