import { prisma } from "../src/lib/prisma.js";

// Order matters: children before parents, to satisfy FK constraints.
export async function resetDb() {
  await prisma.announcementComment.deleteMany();
  await prisma.announcementRead.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.medicalClaimReceipt.deleteMany();
  await prisma.medicalClaim.deleteMany();
  await prisma.payrollCustomAllowance.deleteMany();
  await prisma.payrollCustomDeduction.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.employee.deleteMany();
}
