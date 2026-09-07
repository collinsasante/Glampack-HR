-- Hand-written, NOT the Prisma auto-generated version — the auto-generated migration
-- would DROP and recreate the Employee.role column (destroying every employee's real
-- role), because Prisma has no cast from the old enum straight to a Role-table-backed
-- string. This version converts the column away from the enum FIRST (a Postgres
-- enum's stored value already is its label text, so `::TEXT` preserves every value
-- exactly), then drops the now-unused enum type, THEN creates the new "Role" table —
-- reusing that name while the old enum type of the same name still existed would
-- collide in Postgres' type catalog.

-- Detach the column from the enum type, preserving every existing value as text.
ALTER TABLE "Employee" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Employee" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "Role" (
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleName_permissionKey_key" ON "RolePermission"("roleName", "permissionKey");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleName_fkey" FOREIGN KEY ("roleName") REFERENCES "Role"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the 4 roles that already exist as real employee.role values, each with the
-- exact permission set that reproduces today's hardcoded behavior — drawn from a
-- real audit of every requireRole()/inline role check across all 9 modules. Zero
-- behavior change for existing users on deploy.
INSERT INTO "Role" ("name", "isSystem") VALUES
  ('Employee', true),
  ('Manager', true),
  ('HR', true),
  ('Admin', true);

INSERT INTO "RolePermission" ("id", "roleName", "permissionKey") VALUES
  (gen_random_uuid()::text, 'Manager', 'employees.view_sensitive'),
  (gen_random_uuid()::text, 'Manager', 'employees.view_others'),
  (gen_random_uuid()::text, 'Manager', 'roles.assign_basic'),
  (gen_random_uuid()::text, 'Manager', 'announcements.view_read_counts'),
  (gen_random_uuid()::text, 'Manager', 'leave.view_all'),
  (gen_random_uuid()::text, 'Manager', 'attendance.view_all'),

  (gen_random_uuid()::text, 'HR', 'employees.view_sensitive'),
  (gen_random_uuid()::text, 'HR', 'employees.view_others'),
  (gen_random_uuid()::text, 'HR', 'employees.create'),
  (gen_random_uuid()::text, 'HR', 'employees.edit_others'),
  (gen_random_uuid()::text, 'HR', 'roles.assign_basic'),
  (gen_random_uuid()::text, 'HR', 'roles.assign_senior'),
  (gen_random_uuid()::text, 'HR', 'announcements.view_read_counts'),
  (gen_random_uuid()::text, 'HR', 'announcements.create'),
  (gen_random_uuid()::text, 'HR', 'leave.view_all'),
  (gen_random_uuid()::text, 'HR', 'leave.approve'),
  (gen_random_uuid()::text, 'HR', 'payroll.view_all'),
  (gen_random_uuid()::text, 'HR', 'payroll.manage'),
  (gen_random_uuid()::text, 'HR', 'medical_claims.view_all'),
  (gen_random_uuid()::text, 'HR', 'medical_claims.decide'),
  (gen_random_uuid()::text, 'HR', 'emergency_contacts.manage_any'),
  (gen_random_uuid()::text, 'HR', 'uploads.announcement_images'),
  (gen_random_uuid()::text, 'HR', 'attendance.view_all'),
  (gen_random_uuid()::text, 'HR', 'offices.manage'),

  (gen_random_uuid()::text, 'Admin', 'employees.view_sensitive'),
  (gen_random_uuid()::text, 'Admin', 'employees.view_others'),
  (gen_random_uuid()::text, 'Admin', 'employees.create'),
  (gen_random_uuid()::text, 'Admin', 'employees.edit_others'),
  (gen_random_uuid()::text, 'Admin', 'employees.deactivate'),
  (gen_random_uuid()::text, 'Admin', 'roles.assign_basic'),
  (gen_random_uuid()::text, 'Admin', 'roles.assign_senior'),
  (gen_random_uuid()::text, 'Admin', 'roles.manage'),
  (gen_random_uuid()::text, 'Admin', 'announcements.view_read_counts'),
  (gen_random_uuid()::text, 'Admin', 'announcements.create'),
  (gen_random_uuid()::text, 'Admin', 'announcements.manage_any'),
  (gen_random_uuid()::text, 'Admin', 'leave.view_all'),
  (gen_random_uuid()::text, 'Admin', 'leave.approve'),
  (gen_random_uuid()::text, 'Admin', 'payroll.view_all'),
  (gen_random_uuid()::text, 'Admin', 'payroll.manage'),
  (gen_random_uuid()::text, 'Admin', 'payroll.delete'),
  (gen_random_uuid()::text, 'Admin', 'medical_claims.view_all'),
  (gen_random_uuid()::text, 'Admin', 'medical_claims.decide'),
  (gen_random_uuid()::text, 'Admin', 'emergency_contacts.manage_any'),
  (gen_random_uuid()::text, 'Admin', 'uploads.announcement_images'),
  (gen_random_uuid()::text, 'Admin', 'attendance.view_all'),
  (gen_random_uuid()::text, 'Admin', 'offices.manage');

-- Employee_role_idx already exists from the initial migration (@@index([role]) was
-- already declared) — the column type change doesn't drop it, so no need to recreate.

-- AddForeignKey — safe now: every real value in the column already has a matching
-- Role row from the seed above.
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_role_fkey" FOREIGN KEY ("role") REFERENCES "Role"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
