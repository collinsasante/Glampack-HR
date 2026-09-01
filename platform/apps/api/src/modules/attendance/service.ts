import type { CheckInInput, CheckOutInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { distanceFromOfficeMeters } from "../../lib/geo.js";
import { HttpError } from "../../middleware/errorHandler.js";

function todayDateOnly(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function checkIn(employeeId: string, input: CheckInInput) {
  const date = todayDateOnly();

  const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } } });
  if (existing?.checkInTime) throw new HttpError(409, "Already checked in today");

  const distance = input.position ? distanceFromOfficeMeters(input.position.lat, input.position.lng) : undefined;

  return prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date } },
    create: {
      employeeId,
      date,
      checkInTime: new Date(),
      shift: input.shift,
      checkInLat: input.position?.lat,
      checkInLng: input.position?.lng,
      checkInDistanceFromOfficeM: distance,
      checkInMethod: input.position ? "GPS" : input.ipAddress ? "IPFallback" : undefined,
      checkInCity: input.city,
      checkInRegion: input.region,
      ipAddress: input.ipAddress,
      lateReason: input.lateReason,
    },
    update: {
      checkInTime: new Date(),
      shift: input.shift,
      checkInLat: input.position?.lat,
      checkInLng: input.position?.lng,
      checkInDistanceFromOfficeM: distance,
      checkInMethod: input.position ? "GPS" : input.ipAddress ? "IPFallback" : undefined,
      checkInCity: input.city,
      checkInRegion: input.region,
      lateReason: input.lateReason,
    },
  });
}

// Matches against the most recent open (no check-out yet) record for this employee,
// rather than strictly "today's" record — this is what correctly handles night shifts
// that check in before midnight and check out after it.
export async function checkOut(employeeId: string, input: CheckOutInput) {
  const openRecord = await prisma.attendance.findFirst({
    where: { employeeId, checkInTime: { not: null }, checkOutTime: null },
    orderBy: { date: "desc" },
  });
  if (!openRecord) throw new HttpError(409, "No open check-in found to check out from");

  const distance = input.position ? distanceFromOfficeMeters(input.position.lat, input.position.lng) : undefined;

  return prisma.attendance.update({
    where: { id: openRecord.id },
    data: {
      checkOutTime: new Date(),
      checkOutLat: input.position?.lat,
      checkOutLng: input.position?.lng,
      checkOutDistanceFromOfficeM: distance,
      checkOutMethod: input.position ? "GPS" : input.ipAddress ? "IPFallback" : undefined,
      checkOutCity: input.city,
      checkOutRegion: input.region,
    },
  });
}

export async function listAttendance(filters: { employeeId?: string; from?: Date; to?: Date }) {
  return prisma.attendance.findMany({
    where: {
      employeeId: filters.employeeId,
      date: { gte: filters.from, lte: filters.to },
    },
    orderBy: { date: "desc" },
  });
}
