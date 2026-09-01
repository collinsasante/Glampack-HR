/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Announcement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Announcement" DROP COLUMN "imageUrl",
ADD COLUMN     "imageS3Key" TEXT;
