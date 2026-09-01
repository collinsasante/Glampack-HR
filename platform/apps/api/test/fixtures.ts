import type { Role } from "@glampack/shared";
import { prisma } from "../src/lib/prisma.js";
import { makeFakeToken } from "./fakeToken.js";

let counter = 0;

export async function createTestEmployee(overrides: Partial<{ role: Role; annualLeaveBalance: number }> = {}) {
  counter += 1;
  const uid = `test-uid-${counter}`;
  const email = `test-${counter}@glampack.test`;

  const employee = await prisma.employee.create({
    data: {
      employeeId: `EMPTEST${counter}`,
      firebaseUid: uid,
      fullName: `Test User ${counter}`,
      email,
      role: overrides.role ?? "Employee",
      status: "Permanent",
      department: "Production",
      annualLeaveBalance: overrides.annualLeaveBalance ?? 20,
    },
  });

  const token = makeFakeToken({ uid, email });
  return { employee, token, authHeader: `Bearer ${token}` };
}
