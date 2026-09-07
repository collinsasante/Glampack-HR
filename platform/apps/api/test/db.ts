import { prisma } from "../src/lib/prisma.js";

// The canonical seeded state (mirrors the add_dynamic_roles migration exactly) —
// re-applied every test so a test that creates a custom role or toggles a
// permission never leaks into the next test.
const SEEDED_PERMISSIONS: Record<string, string[]> = {
  Employee: [],
  Manager: [
    "employees.view_sensitive",
    "employees.view_others",
    "roles.assign_basic",
    "announcements.view_read_counts",
    "leave.view_all",
    "attendance.view_all",
  ],
  HR: [
    "employees.view_sensitive",
    "employees.view_others",
    "employees.create",
    "employees.edit_others",
    "roles.assign_basic",
    "roles.assign_senior",
    "announcements.view_read_counts",
    "announcements.create",
    "leave.view_all",
    "leave.approve",
    "payroll.view_all",
    "payroll.manage",
    "medical_claims.view_all",
    "medical_claims.decide",
    "emergency_contacts.manage_any",
    "uploads.announcement_images",
    "attendance.view_all",
    "offices.manage",
  ],
  Admin: [
    "employees.view_sensitive",
    "employees.view_others",
    "employees.create",
    "employees.edit_others",
    "employees.deactivate",
    "roles.assign_basic",
    "roles.assign_senior",
    "roles.manage",
    "announcements.view_read_counts",
    "announcements.create",
    "announcements.manage_any",
    "leave.view_all",
    "leave.approve",
    "payroll.view_all",
    "payroll.manage",
    "payroll.delete",
    "medical_claims.view_all",
    "medical_claims.decide",
    "emergency_contacts.manage_any",
    "uploads.announcement_images",
    "attendance.view_all",
    "offices.manage",
  ],
};

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
  await prisma.office.deleteMany();

  // Drop any custom role a test created, then reset the 4 seeded roles' permissions
  // back to their canonical starting state.
  await prisma.role.deleteMany({ where: { isSystem: false } });
  await prisma.rolePermission.deleteMany();
  for (const [roleName, keys] of Object.entries(SEEDED_PERMISSIONS)) {
    for (const permissionKey of keys) {
      await prisma.rolePermission.upsert({
        where: { roleName_permissionKey: { roleName, permissionKey } },
        create: { roleName, permissionKey },
        update: {},
      });
    }
  }
}
