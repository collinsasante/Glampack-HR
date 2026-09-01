import { z } from "zod";
import { CLAIM_STATUSES } from "../enums.js";

export const createMedicalClaimSchema = z.object({
  dateOfVisit: z.coerce.date(),
  hospitalClinicName: z.string().min(1),
  descriptionOfTreatment: z.string().min(1),
  amountSpent: z.number().nonnegative(),
  receiptKeys: z.array(z.object({ s3Key: z.string(), filename: z.string(), url: z.string().url() })).default([]),
});
export type CreateMedicalClaimInput = z.infer<typeof createMedicalClaimSchema>;

export const decideMedicalClaimSchema = z.object({
  adminNotes: z.string().optional(),
});
export type DecideMedicalClaimInput = z.infer<typeof decideMedicalClaimSchema>;

export const listMedicalClaimsQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.enum(CLAIM_STATUSES).optional(),
});
export type ListMedicalClaimsQuery = z.infer<typeof listMedicalClaimsQuerySchema>;
