import { z } from "zod";
import { PERMISSION_KEYS } from "../permissions.js";

export const createRoleSchema = z.object({
  name: z.string().min(1).max(40),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const setRolePermissionSchema = z.object({
  key: z.enum(PERMISSION_KEYS as [string, ...string[]]),
  granted: z.boolean(),
});
export type SetRolePermissionInput = z.infer<typeof setRolePermissionSchema>;
