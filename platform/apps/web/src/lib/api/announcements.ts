import type { AnnouncementPriority, AnnouncementType, CreateAnnouncementInput, CreateCommentInput } from "@glampack/shared";
import { apiDelete, apiGet, apiPatch, apiPost } from "../apiClient";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  priority: AnnouncementPriority | null;
  postedByEmployeeId: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementComment {
  id: string;
  announcementId: string;
  employeeId: string;
  comment: string;
  parentCommentId: string | null;
  createdAt: string;
}

export const listAnnouncements = () => apiGet<Announcement[]>("/announcements");
export const createAnnouncement = (data: CreateAnnouncementInput) =>
  apiPost<Announcement>("/announcements", data);
export const updateAnnouncement = (id: string, data: Partial<CreateAnnouncementInput>) =>
  apiPatch<Announcement>(`/announcements/${id}`, data);
export const deleteAnnouncement = (id: string) => apiDelete(`/announcements/${id}`);
export const markAnnouncementRead = (id: string) => apiPost(`/announcements/${id}/read`);
export const listMyReadAnnouncementIds = () => apiGet<string[]>("/announcements/reads/me");
export const listAnnouncementReadCounts = () => apiGet<Record<string, number>>("/announcements/reads/counts");

export const listComments = (announcementId: string) =>
  apiGet<AnnouncementComment[]>(`/announcements/${announcementId}/comments`);
export const createComment = (announcementId: string, data: CreateCommentInput) =>
  apiPost<AnnouncementComment>(`/announcements/${announcementId}/comments`, data);
export const deleteComment = (commentId: string) => apiDelete(`/announcement-comments/${commentId}`);
