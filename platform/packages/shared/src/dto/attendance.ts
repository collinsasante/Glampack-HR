import { z } from "zod";
import { SHIFTS } from "../enums.js";

// Only raw coordinates — distance-from-office is computed server-side (Haversine
// from a fixed office point), never accepted as a client-submitted number.
const geoPositionSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const checkInSchema = z.object({
  shift: z.enum(SHIFTS),
  position: geoPositionSchema.optional(),
  // Which of the company's real offices the employee says they're working at today —
  // the distance-from-office figure is only meaningful relative to a specific office,
  // so with multiple real locations this can't be assumed. Left optional at the schema
  // level (never blocks a check-in even without an office selected or configured yet),
  // but the client UI requires a selection whenever offices exist.
  officeId: z.string().optional(),
  ipAddress: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  lateReason: z.string().optional(),
});
export type CheckInInput = z.infer<typeof checkInSchema>;

export const checkOutSchema = z.object({
  position: geoPositionSchema.optional(),
  officeId: z.string().optional(),
  ipAddress: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
});
export type CheckOutInput = z.infer<typeof checkOutSchema>;

export const listAttendanceQuerySchema = z.object({
  employeeId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;
