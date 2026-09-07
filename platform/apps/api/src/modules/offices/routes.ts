import { Router } from "express";
import { createOfficeSchema, updateOfficeSchema } from "@glampack/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const officesRouter = Router();
officesRouter.use(authenticate);

// Open to everyone — every employee needs the office list to pick where they're
// checking in/out from. Only roles with offices.manage can add, edit, or remove one.
officesRouter.get("/", asyncHandler(controller.list));

officesRouter.post(
  "/",
  requirePermission("offices.manage"),
  validate(createOfficeSchema),
  asyncHandler(controller.create)
);

officesRouter.patch(
  "/:id",
  requirePermission("offices.manage"),
  validate(updateOfficeSchema),
  asyncHandler(controller.update)
);

officesRouter.delete("/:id", requirePermission("offices.manage"), asyncHandler(controller.remove));
