import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/authorize.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const uploadsRouter = Router();

uploadsRouter.use(authenticate);

uploadsRouter.post("/medical-receipts/presign", asyncHandler(controller.presignMedicalReceipt));
uploadsRouter.post(
  "/announcement-images/presign",
  requireRole(["Admin", "HR"]),
  asyncHandler(controller.presignAnnouncementImage)
);
