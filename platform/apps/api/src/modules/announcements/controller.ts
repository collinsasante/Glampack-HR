import type { Request, Response } from "express";
import { hasPermission } from "../../lib/permissions.js";
import * as service from "./service.js";

const isAdmin = (req: Request) => hasPermission(req.user!.role, "announcements.manage_any");

export async function list(_req: Request, res: Response) {
  res.json(await service.listAnnouncements());
}

export async function create(req: Request, res: Response) {
  const announcement = await service.createAnnouncement(req.user!.id, req.body);
  res.status(201).json(announcement);
}

export async function update(req: Request, res: Response) {
  const announcement = await service.updateAnnouncement(
    req.params.id!,
    { id: req.user!.id, isAdmin: await isAdmin(req) },
    req.body
  );
  res.json(announcement);
}

export async function remove(req: Request, res: Response) {
  await service.deleteAnnouncement(req.params.id!, { id: req.user!.id, isAdmin: await isAdmin(req) });
  res.status(204).send();
}

export async function listMyReads(req: Request, res: Response) {
  res.json(await service.listMyReadAnnouncementIds(req.user!.id));
}

export async function readCounts(_req: Request, res: Response) {
  res.json(await service.getReadCounts());
}

export async function markRead(req: Request, res: Response) {
  const read = await service.markAnnouncementRead(req.params.id!, req.user!.id);
  res.status(201).json(read);
}

export async function listComments(req: Request, res: Response) {
  res.json(await service.listComments(req.params.id!));
}

export async function createComment(req: Request, res: Response) {
  const comment = await service.createComment(req.params.id!, req.user!.id, req.body);
  res.status(201).json(comment);
}

export async function deleteComment(req: Request, res: Response) {
  await service.deleteComment(req.params.commentId!, { id: req.user!.id, isAdmin: await isAdmin(req) });
  res.status(204).send();
}
