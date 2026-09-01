import { Router } from "express";
import { createEmergencyContactSchema, updateEmergencyContactSchema } from "@glampack/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requireSelfOrRole } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

// Nested under /employees/:employeeId/emergency-contacts
export const nestedEmergencyContactsRouter = Router({ mergeParams: true });
nestedEmergencyContactsRouter.use(authenticate);
nestedEmergencyContactsRouter.get(
  "/",
  requireSelfOrRole(["Admin", "HR"], (req) => req.params.employeeId!),
  asyncHandler(controller.list)
);
nestedEmergencyContactsRouter.post(
  "/",
  requireSelfOrRole(["Admin", "HR"], (req) => req.params.employeeId!),
  validate(createEmergencyContactSchema),
  asyncHandler(controller.create)
);

// Top-level /emergency-contacts/:id — ownership is checked in the service layer
// since we don't know the contact's employeeId until it's looked up.
export const emergencyContactsRouter = Router();
emergencyContactsRouter.use(authenticate);
emergencyContactsRouter.patch(
  "/:id",
  validate(updateEmergencyContactSchema),
  asyncHandler(controller.update)
);
emergencyContactsRouter.delete("/:id", asyncHandler(controller.remove));
