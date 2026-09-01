import { prisma } from "./prisma.js";

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MAX_ATTEMPTS = 10;

function randomSuffix(length = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return result;
}

// The old client-side generator (auth.js) had no uniqueness check at all.
// This retries against the DB's @unique constraint as the final backstop.
export async function generateUniqueEmployeeId(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = `EMP${randomSuffix()}`;
    const existing = await prisma.employee.findUnique({ where: { employeeId: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Failed to generate a unique employee ID after multiple attempts");
}
