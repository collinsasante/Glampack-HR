import { z } from "zod";
import { EMERGENCY_CONTACT_RELATIONSHIPS } from "../enums.js";

export const createEmergencyContactSchema = z.object({
  name: z.string().min(1),
  relationship: z.enum(EMERGENCY_CONTACT_RELATIONSHIPS),
  phoneNumber: z.string().min(1),
  email: z.string().email().optional(),
  address: z.string().optional(),
});
export type CreateEmergencyContactInput = z.infer<typeof createEmergencyContactSchema>;

// employeeId is intentionally never part of this schema — the link is immutable at the app layer.
export const updateEmergencyContactSchema = createEmergencyContactSchema.partial();
export type UpdateEmergencyContactInput = z.infer<typeof updateEmergencyContactSchema>;
