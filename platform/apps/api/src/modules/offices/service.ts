import type { CreateOfficeInput, UpdateOfficeInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function listOffices() {
  return prisma.office.findMany({ orderBy: { name: "asc" } });
}

export async function createOffice(input: CreateOfficeInput) {
  return prisma.office.create({ data: input });
}

export async function updateOffice(id: string, input: UpdateOfficeInput) {
  const office = await prisma.office.findUnique({ where: { id } });
  if (!office) throw new HttpError(404, "Office not found");
  return prisma.office.update({ where: { id }, data: input });
}

// Attendance rows that reference this office keep their existing distance figure and
// just lose the office link (onDelete: SetNull) — historical data isn't destroyed.
export async function deleteOffice(id: string) {
  const office = await prisma.office.findUnique({ where: { id } });
  if (!office) throw new HttpError(404, "Office not found");
  await prisma.office.delete({ where: { id } });
}
