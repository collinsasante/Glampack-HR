import type { CreateMedicalClaimInput, DecideMedicalClaimInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function listMedicalClaims(filters: { employeeId?: string; status?: string }) {
  return prisma.medicalClaim.findMany({
    where: { employeeId: filters.employeeId, status: filters.status as any },
    include: { receipts: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createMedicalClaim(employeeId: string, input: CreateMedicalClaimInput) {
  return prisma.medicalClaim.create({
    data: {
      employeeId,
      dateOfVisit: input.dateOfVisit,
      hospitalClinicName: input.hospitalClinicName,
      descriptionOfTreatment: input.descriptionOfTreatment,
      amountSpent: input.amountSpent,
      status: "Pending",
      receipts: {
        create: input.receiptKeys.map((r) => ({ filename: r.filename, s3Key: r.s3Key, url: r.url })),
      },
    },
    include: { receipts: true },
  });
}

async function decide(id: string, status: "Approved" | "Rejected", adminNotes?: string) {
  const claim = await prisma.medicalClaim.findUnique({ where: { id } });
  if (!claim) throw new HttpError(404, "Medical claim not found");
  if (claim.status !== "Pending") throw new HttpError(409, "Only pending claims can be decided");
  return prisma.medicalClaim.update({ where: { id }, data: { status, adminNotes } });
}

export const approveMedicalClaim = (id: string, input: DecideMedicalClaimInput) =>
  decide(id, "Approved", input.adminNotes);

export const rejectMedicalClaim = (id: string, input: DecideMedicalClaimInput) =>
  decide(id, "Rejected", input.adminNotes);
