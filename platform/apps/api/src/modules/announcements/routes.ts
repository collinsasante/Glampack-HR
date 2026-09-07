import { Router } from "express";
import { createAnnouncementSchema, createCommentSchema, updateAnnouncementSchema } from "@glampack/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const announcementsRouter = Router();

announcementsRouter.use(authenticate);

announcementsRouter.get("/", asyncHandler(controller.list));
announcementsRouter.get("/reads/me", asyncHandler(controller.listMyReads));
announcementsRouter.get(
  "/reads/counts",
  requirePermission("announcements.view_read_counts"),
  asyncHandler(controller.readCounts)
);

announcementsRouter.post(
  "/",
  requirePermission("announcements.create"),
  validate(createAnnouncementSchema),
  asyncHandler(controller.create)
);

announcementsRouter.patch("/:id", validate(updateAnnouncementSchema), asyncHandler(controller.update));
announcementsRouter.delete("/:id", asyncHandler(controller.remove));

announcementsRouter.post("/:id/read", asyncHandler(controller.markRead));

announcementsRouter.get("/:id/comments", asyncHandler(controller.listComments));
announcementsRouter.post(
  "/:id/comments",
  validate(createCommentSchema),
  asyncHandler(controller.createComment)
);

export const announcementCommentsRouter = Router();
announcementCommentsRouter.use(authenticate);
announcementCommentsRouter.delete("/:commentId", asyncHandler(controller.deleteComment));
