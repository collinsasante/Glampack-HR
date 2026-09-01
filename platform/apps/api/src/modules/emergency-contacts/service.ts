import type { CreateEmergencyContactInput, UpdateEmergencyContactInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function listForEmployee(employeeId: string) {
  return prisma.emergencyContact.findMany({ where: { employeeId } });
}

export async function create(employeeId: string, input: CreateEmergencyContactInput) {
  return prisma.emergencyContact.create({ data: { ...input, employeeId } });
}

async function assertAccess(contactId: string, requester: { id: string; isStaff: boolean }) {
  const contact = await prisma.emergencyContact.findUnique({ where: { id: contactId } });
  if (!contact) throw new HttpError(404, "Emergency contact not found");
  if (!requester.isStaff && contact.employeeId !== requester.id) {
    throw new HttpError(403, "Not your emergency contact");
  }
  return contact;
}

// employeeId is never accepted here — the DTO doesn't include it, so the link
// can't be re-parented to a different employee via this endpoint.
export async function update(
  id: string,
  requester: { id: string; isStaff: boolean },
  input: UpdateEmergencyContactInput
) {
  await assertAccess(id, requester);
  return prisma.emergencyContact.update({ where: { id }, data: input });
}

export async function remove(id: string, requester: { id: string; isStaff: boolean }) {
  await assertAccess(id, requester);
  await prisma.emergencyContact.delete({ where: { id } });
}
