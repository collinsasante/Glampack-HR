-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('Low', 'Medium', 'High');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "priority" "AnnouncementPriority",
ALTER COLUMN "type" SET DEFAULT 'General';
