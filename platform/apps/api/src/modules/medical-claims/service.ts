import type { CreateMedicalClaimInput, DecideMedicalClaimInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { presignGet } from "../../lib/s3.js";

// The bucket is private — the `url` column is kept only as a stable reference
// (see lib/s3.ts's presignUpload comment); every response gets a freshly
// signed, short-lived URL derived from the receipt's real s3Key instead.
async function withSignedReceipts<T extends { receipts: { s3Key: string }[] }>(claim: T): Promise<T> {
  const receipts = await Promise.all(
    claim.receipts.map(async (r) => ({ ...r, url: await presignGet(r.s3Key) }))
  );
  return { ...claim, receipts };
}

export async function listMedicalClaims(filters: { employeeId?: string; status?: string }) {
  const claims = await prisma.medicalClaim.findMany({
    where: { employeeId: filters.employeeId, status: filters.status as any },
    include: { receipts: true },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(claims.map(withSignedReceipts));
}

export async function createMedicalClaim(employeeId: string, input: CreateMedicalClaimInput) {
  const claim = await prisma.medicalClaim.create({
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
  return withSignedReceipts(claim);
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
