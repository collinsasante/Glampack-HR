/*
  Warnings:

  - You are about to drop the column `checkInAccuracyM` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `checkOutAccuracyM` on the `Attendance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "checkInAccuracyM",
DROP COLUMN "checkOutAccuracyM",
ADD COLUMN     "checkInDistanceFromOfficeM" DECIMAL(10,2),
ADD COLUMN     "checkOutDistanceFromOfficeM" DECIMAL(10,2);
