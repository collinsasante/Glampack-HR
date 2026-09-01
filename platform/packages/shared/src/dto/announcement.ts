import { z } from "zod";
import { ANNOUNCEMENT_PRIORITIES, ANNOUNCEMENT_TYPES } from "../enums.js";

export const createAnnouncementSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(ANNOUNCEMENT_TYPES).default("General"),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).optional(),
  // undefined = leave the existing image alone (partial update); null = explicitly remove it.
  imageS3Key: z.string().min(1).nullable().optional(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = createAnnouncementSchema.partial();
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

export const createCommentSchema = z.object({
  comment: z.string().min(1),
  parentCommentId: z.string().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
