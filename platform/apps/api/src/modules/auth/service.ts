import type { SignUpInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { generateUniqueEmployeeId } from "../../lib/employeeId.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function selfSignUp(firebaseUid: string, email: string, input: SignUpInput) {
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.employee.findFirst({
    where: { OR: [{ firebaseUid }, { email: normalizedEmail }] },
  });
  if (existing) {
    throw new HttpError(409, "An employee record already exists for this account");
  }

  const employeeId = await generateUniqueEmployeeId();

  // Default Values per CLAUDE.md: Role=Employee, Status=Permanent, Annual Leave Balance=20.
  return prisma.employee.create({
    data: {
      firebaseUid,
      employeeId,
      email: normalizedEmail,
      fullName: input.fullName,
      department: input.department,
      jobTitle: input.jobTitle,
      dateOfBirth: input.dateOfBirth,
      phone: input.phone,
      role: "Employee",
      status: "Permanent",
      accountStatus: "Active",
      annualLeaveBalance: 20,
    },
  });
}
