"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AttachmentUploader } from "@/components/announcements/attachment-uploader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/apiClient";
import { createAnnouncement, updateAnnouncement, type Announcement } from "@/lib/api/announcements";
import type { AnnouncementPriority, AnnouncementType } from "@glampack/shared";

const TYPES: AnnouncementType[] = ["General", "HR", "Urgent", "Event", "Other"];
const PRIORITIES: AnnouncementPriority[] = ["Low", "Medium", "High"];

export interface AnnouncementDraft {
  title: string;
  message: string;
  type: AnnouncementType;
  priority: AnnouncementPriority | "";
  imageUrl: string | null;
}

const EMPTY_DRAFT: AnnouncementDraft = { title: "", message: "", type: "General", priority: "", imageUrl: null };

export function AnnouncementForm({
  open,
  onOpenChange,
  editing,
  duplicateFrom,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing announcement in place. */
  editing?: Announcement | null;
  /** Pre-filling a new announcement from an existing one ("Duplicate"). */
  duplicateFrom?: Announcement | null;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<AnnouncementDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = editing ?? duplicateFrom;

  useEffect(() => {
    if (open) {
      setDraft(
        source
          ? {
              title: editing ? source.title : `Copy of ${source.title}`,
              message: source.message,
              type: source.type,
              priority: source.priority ?? "",
              imageUrl: editing ? source.imageUrl : null,
            }
          : EMPTY_DRAFT
      );
      setError(null);
    }
  }, [open, source, editing]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload = {
      title: draft.title.trim(),
      message: draft.message.trim(),
      type: draft.type,
      priority: draft.priority || undefined,
      imageUrl: draft.imageUrl ?? undefined,
    };
    try {
      if (editing) {
        await updateAnnouncement(editing.id, payload);
        toast.success("Announcement updated successfully.");
      } else {
        await createAnnouncement(payload);
        toast.success("Announcement published successfully.");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save announcement");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details below — changes are visible to everyone immediately."
              : "This will be posted and visible to employees immediately."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ann-title">Announcement Title</Label>
            <Input
              id="ann-title"
              required
              placeholder="Enter announcement title"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ann-message">Announcement Content</Label>
            <Textarea
              id="ann-message"
              required
              rows={6}
              placeholder="Write the announcement message…"
              value={draft.message}
              onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: (v as AnnouncementType) ?? "General" }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={draft.priority || "none"}
                onValueChange={(v) => setDraft((d) => ({ ...d, priority: v === "none" ? "" : (v as AnnouncementPriority) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{draft.priority ? `${draft.priority} priority` : "No priority"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No priority</SelectItem>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p} priority
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Attachment</Label>
            <AttachmentUploader value={draft.imageUrl} onChange={(url) => setDraft((d) => ({ ...d, imageUrl: url }))} />
          </div>

          {error && <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save Changes" : "Publish Announcement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
