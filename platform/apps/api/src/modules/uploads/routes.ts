import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const uploadsRouter = Router();

uploadsRouter.use(authenticate);

uploadsRouter.post("/medical-receipts/presign", asyncHandler(controller.presignMedicalReceipt));
uploadsRouter.post(
  "/announcement-images/presign",
  requirePermission("uploads.announcement_images"),
  asyncHandler(controller.presignAnnouncementImage)
);
