import type { CheckInInput, CheckOutInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { distanceMeters } from "../../lib/geo.js";
import { HttpError } from "../../middleware/errorHandler.js";

function todayDateOnly(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Distance is only meaningful relative to the specific office the employee said
// they're at — an unrecognized/missing officeId just means no distance is computed,
// same non-blocking behavior as no GPS position at all.
async function distanceFromOffice(officeId: string | undefined, lat: number, lng: number) {
  if (!officeId) return undefined;
  const office = await prisma.office.findUnique({ where: { id: officeId } });
  if (!office) return undefined;
  return distanceMeters(lat, lng, Number(office.latitude), Number(office.longitude));
}

export async function checkIn(employeeId: string, input: CheckInInput) {
  const date = todayDateOnly();

  const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } } });
  if (existing?.checkInTime) throw new HttpError(409, "Already checked in today");

  const distance = input.position
    ? await distanceFromOffice(input.officeId, input.position.lat, input.position.lng)
    : undefined;

  return prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date } },
    create: {
      employeeId,
      date,
      checkInTime: new Date(),
      shift: input.shift,
      checkInLat: input.position?.lat,
      checkInLng: input.position?.lng,
      checkInOfficeId: input.officeId,
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
      checkInOfficeId: input.officeId,
      checkInDistanceFromOfficeM: distance,
      checkInMethod: input.position ? "GPS" : input.ipAddress ? "IPFallback" : undefined,
      checkInCity: input.city,
      checkInRegion: input.region,
      lateReason: input.lateReason,
    },
    include: { checkInOffice: true, checkOutOffice: true },
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

  const distance = input.position
    ? await distanceFromOffice(input.officeId, input.position.lat, input.position.lng)
    : undefined;

  return prisma.attendance.update({
    where: { id: openRecord.id },
    data: {
      checkOutTime: new Date(),
      checkOutLat: input.position?.lat,
      checkOutLng: input.position?.lng,
      checkOutOfficeId: input.officeId,
      checkOutDistanceFromOfficeM: distance,
      checkOutMethod: input.position ? "GPS" : input.ipAddress ? "IPFallback" : undefined,
      checkOutCity: input.city,
      checkOutRegion: input.region,
    },
    include: { checkInOffice: true, checkOutOffice: true },
  });
}

export async function listAttendance(filters: { employeeId?: string; from?: Date; to?: Date }) {
  return prisma.attendance.findMany({
    where: {
      employeeId: filters.employeeId,
      date: { gte: filters.from, lte: filters.to },
    },
    orderBy: { date: "desc" },
    include: { checkInOffice: true, checkOutOffice: true },
  });
}
