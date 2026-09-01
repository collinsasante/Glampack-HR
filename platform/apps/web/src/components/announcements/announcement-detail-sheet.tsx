"use client";

import { Copy, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { priorityBadgeVariant, typeBadgeVariant } from "@/lib/announcement-format";
import {
  createComment,
  deleteComment,
  listComments,
  markAnnouncementRead,
  type Announcement,
  type AnnouncementComment,
} from "@/lib/api/announcements";
import type { Employee } from "@/lib/api/employees";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AnnouncementDetailSheet({
  announcement,
  employeeById,
  currentEmployee,
  readCount,
  activeEmployeeCount,
  open,
  onOpenChange,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  announcement: Announcement | null;
  employeeById: Record<string, Employee>;
  currentEmployee: Employee;
  readCount?: number;
  activeEmployeeCount?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (a: Announcement) => void;
  onDuplicate: (a: Announcement) => void;
  onDelete: (a: Announcement) => void;
}) {
  const [comments, setComments] = useState<AnnouncementComment[] | null>(null);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!announcement || !open) return;
    markAnnouncementRead(announcement.id);
    setComments(null);
    listComments(announcement.id).then(setComments);
  }, [announcement, open]);

  if (!announcement) return null;

  const author = employeeById[announcement.postedByEmployeeId];
  const canManage = currentEmployee.role === "Admin" || announcement.postedByEmployeeId === currentEmployee.id;
  const showReadStats = readCount !== undefined && activeEmployeeCount !== undefined;
  const readRate = showReadStats && activeEmployeeCount! > 0 ? Math.round((readCount! / activeEmployeeCount!) * 100) : 0;
  const wasEdited = announcement.updatedAt !== announcement.createdAt;

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !announcement) return;
    setPosting(true);
    try {
      await createComment(announcement.id, { comment: newComment.trim() });
      setNewComment("");
      setComments(await listComments(announcement.id));
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteComment(id: string) {
    if (!announcement) return;
    await deleteComment(id);
    setComments(await listComments(announcement.id));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={typeBadgeVariant(announcement.type)}>{announcement.type}</Badge>
            {announcement.priority && (
              <Badge variant={priorityBadgeVariant(announcement.priority)}>{announcement.priority} priority</Badge>
            )}
          </div>
          <SheetTitle className="text-xl">{announcement.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {author ? initials(author.fullName) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{author?.fullName ?? "Unknown"}</p>
              <p className="text-xs text-muted-foreground">
                Posted {new Date(announcement.createdAt).toLocaleString()}
                {wasEdited && ` · edited ${new Date(announcement.updatedAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>

          <Separator />

          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{announcement.message}</p>

          {announcement.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={announcement.imageUrl} alt="" className="w-full rounded-lg border border-border" />
          )}

          {showReadStats && (
            <>
              <Separator />
              <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Read Rate</p>
                  <p className="font-heading text-xl font-bold text-foreground">{readRate}%</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {readCount} of {activeEmployeeCount} active employees
                </p>
              </div>
            </>
          )}

          {canManage && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(announcement)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDuplicate(announcement)}>
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(announcement)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              </div>
            </>
          )}

          <Separator />

          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Comments</p>
            {comments === null ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {comments.length === 0 && <li className="text-sm text-muted-foreground">No comments yet.</li>}
                {comments.map((c) => {
                  const commenter = employeeById[c.employeeId];
                  const canDeleteComment = currentEmployee.role === "Admin" || c.employeeId === currentEmployee.id;
                  return (
                    <li key={c.id} className="flex items-start gap-2.5 text-sm">
                      <Avatar size="sm" className="mt-0.5">
                        <AvatarFallback className="bg-muted text-[10px] font-bold">
                          {commenter ? initials(commenter.fullName) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground">
                          <span className="font-medium">{commenter?.fullName ?? "Unknown"}</span>{" "}
                          <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </p>
                        <p className="text-muted-foreground">{c.comment}</p>
                      </div>
                      {canDeleteComment && (
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteComment(c.id)} aria-label="Delete comment">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                className="h-9"
              />
              <Button type="submit" size="sm" disabled={posting || !newComment.trim()}>
                Post
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
