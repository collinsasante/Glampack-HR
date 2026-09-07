import { Router } from "express";
import {
  createMedicalClaimSchema,
  decideMedicalClaimSchema,
  listMedicalClaimsQuerySchema,
} from "@glampack/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const medicalClaimsRouter = Router();

medicalClaimsRouter.use(authenticate);

medicalClaimsRouter.get(
  "/",
  validate(listMedicalClaimsQuerySchema, "query"),
  asyncHandler(controller.list)
);
medicalClaimsRouter.post("/", validate(createMedicalClaimSchema), asyncHandler(controller.create));

medicalClaimsRouter.patch(
  "/:id/approve",
  requirePermission("medical_claims.decide"),
  validate(decideMedicalClaimSchema),
  asyncHandler(controller.approve)
);

medicalClaimsRouter.patch(
  "/:id/reject",
  requirePermission("medical_claims.decide"),
  validate(decideMedicalClaimSchema),
  asyncHandler(controller.reject)
);
