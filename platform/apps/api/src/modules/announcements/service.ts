import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { presignGet } from "../../lib/s3.js";

// The bucket is private, so nothing stores a real image URL — every response
// gets a freshly signed one derived from the stored S3 key.
async function withSignedImage<T extends { imageS3Key: string | null }>(
  announcement: T
): Promise<Omit<T, "imageS3Key"> & { imageUrl: string | null }> {
  const { imageS3Key, ...rest } = announcement;
  return { ...rest, imageUrl: imageS3Key ? await presignGet(imageS3Key) : null };
}

export async function listAnnouncements() {
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return Promise.all(announcements.map(withSignedImage));
}

export async function createAnnouncement(postedByEmployeeId: string, input: CreateAnnouncementInput) {
  const announcement = await prisma.announcement.create({ data: { ...input, postedByEmployeeId } });
  return withSignedImage(announcement);
}

export async function updateAnnouncement(
  id: string,
  requester: { id: string; isAdmin: boolean },
  input: UpdateAnnouncementInput
) {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) throw new HttpError(404, "Announcement not found");
  if (!requester.isAdmin && announcement.postedByEmployeeId !== requester.id) {
    throw new HttpError(403, "Only the author or an admin can edit this announcement");
  }
  const updated = await prisma.announcement.update({ where: { id }, data: input });
  return withSignedImage(updated);
}

export async function deleteAnnouncement(id: string, requester: { id: string; isAdmin: boolean }) {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) throw new HttpError(404, "Announcement not found");
  if (!requester.isAdmin && announcement.postedByEmployeeId !== requester.id) {
    throw new HttpError(403, "Only the author or an admin can delete this announcement");
  }
  await prisma.announcement.delete({ where: { id } });
}

// Idempotent: repeated calls just no-op via the DB unique constraint instead of erroring,
// closing a dedup gap that today only exists by client convention.
export async function markAnnouncementRead(announcementId: string, employeeId: string) {
  return prisma.announcementRead.upsert({
    where: { announcementId_employeeId: { announcementId, employeeId } },
    create: { announcementId, employeeId },
    update: {},
  });
}

export async function listMyReadAnnouncementIds(employeeId: string) {
  const reads = await prisma.announcementRead.findMany({
    where: { employeeId },
    select: { announcementId: true },
  });
  return reads.map((r) => r.announcementId);
}

// Real aggregate read counts per announcement — backs the read-rate stat shown
// to Admin/HR, computed from actual AnnouncementRead rows, not estimated.
export async function getReadCounts(): Promise<Record<string, number>> {
  const grouped = await prisma.announcementRead.groupBy({
    by: ["announcementId"],
    _count: { _all: true },
  });
  return Object.fromEntries(grouped.map((g) => [g.announcementId, g._count._all]));
}

export async function listComments(announcementId: string) {
  return prisma.announcementComment.findMany({
    where: { announcementId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createComment(
  announcementId: string,
  employeeId: string,
  input: { comment: string; parentCommentId?: string }
) {
  return prisma.announcementComment.create({
    data: { announcementId, employeeId, comment: input.comment, parentCommentId: input.parentCommentId },
  });
}

export async function deleteComment(id: string, requester: { id: string; isAdmin: boolean }) {
  const comment = await prisma.announcementComment.findUnique({ where: { id } });
  if (!comment) throw new HttpError(404, "Comment not found");
  if (!requester.isAdmin && comment.employeeId !== requester.id) {
    throw new HttpError(403, "Only the author or an admin can delete this comment");
  }
  await prisma.announcementComment.delete({ where: { id } });
}
