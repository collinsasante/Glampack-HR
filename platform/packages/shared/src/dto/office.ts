import { z } from "zod";

export const createOfficeSchema = z.object({
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type CreateOfficeInput = z.infer<typeof createOfficeSchema>;

export const updateOfficeSchema = createOfficeSchema.partial();
export type UpdateOfficeInput = z.infer<typeof updateOfficeSchema>;
