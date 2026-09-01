"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteAnnouncement, type Announcement } from "@/lib/api/announcements";

export function DeleteAnnouncementDialog({
  announcement,
  open,
  onOpenChange,
  onDeleted,
}: {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!announcement) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(announcement.id);
      toast.success("Announcement deleted.");
      onOpenChange(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !deleting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete announcement?</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete
            {announcement ? <> &ldquo;{announcement.title}&rdquo;</> : " this announcement"}? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete Announcement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
