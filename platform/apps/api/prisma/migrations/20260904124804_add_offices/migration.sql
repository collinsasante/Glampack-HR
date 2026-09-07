-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "checkInOfficeId" TEXT,
ADD COLUMN     "checkOutOfficeId" TEXT;

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_checkInOfficeId_fkey" FOREIGN KEY ("checkInOfficeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_checkOutOfficeId_fkey" FOREIGN KEY ("checkOutOfficeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration: seed one real Office row from the previously-hardcoded single-office
-- env vars (OFFICE_LATITUDE/OFFICE_LONGITUDE), then attribute every existing Attendance
-- row's already-computed distance to it — otherwise historical distances would become
-- orphaned (attributed to no office at all) the moment this migration lands. Admins can
-- rename this row and add the company's other real offices via the new Offices UI.
INSERT INTO "Office" ("id", "name", "latitude", "longitude", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Head Office', 5.603717, -0.186964, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "Attendance"
SET "checkInOfficeId" = (SELECT "id" FROM "Office" WHERE "name" = 'Head Office' LIMIT 1)
WHERE "checkInDistanceFromOfficeM" IS NOT NULL;

UPDATE "Attendance"
SET "checkOutOfficeId" = (SELECT "id" FROM "Office" WHERE "name" = 'Head Office' LIMIT 1)
WHERE "checkOutDistanceFromOfficeM" IS NOT NULL;
