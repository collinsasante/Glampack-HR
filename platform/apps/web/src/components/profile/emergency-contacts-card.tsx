"use client";

import { Trash2, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createEmergencyContact,
  deleteEmergencyContact,
  listEmergencyContacts,
  type EmergencyContact,
} from "@/lib/api/emergency-contacts";
import type { EmergencyContactRelationship } from "@glampack/shared";

const RELATIONSHIPS: EmergencyContactRelationship[] = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function EmergencyContactsCard({ employeeId }: { employeeId: string }) {
  const [contacts, setContacts] = useState<EmergencyContact[] | null>(null);
  const [form, setForm] = useState({ name: "", relationship: "Spouse" as EmergencyContactRelationship, phoneNumber: "", email: "" });
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmergencyContact | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    setContacts(await listEmergencyContacts(employeeId));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      await createEmergencyContact(employeeId, { ...form, email: form.email || undefined });
      setForm({ name: "", relationship: "Spouse", phoneNumber: "", email: "" });
      await refresh();
      toast.success("Emergency contact added.");
    } finally {
      setAdding(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmergencyContact(deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
      toast.success("Emergency contact removed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Emergency Contacts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {contacts === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No emergency contacts yet.</p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Avatar size="sm">
                  <AvatarFallback className="bg-muted text-[10px] font-bold">
                    <UserRound className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {c.name} <span className="font-normal text-muted-foreground">· {c.relationship}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{c.phoneNumber}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(c)}
                  aria-label="Remove contact"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3 border-t border-border pt-4">
          <Input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Select value={form.relationship} onValueChange={(v) => setForm((f) => ({ ...f, relationship: (v as EmergencyContactRelationship) ?? "Other" }))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            required
            placeholder="Phone Number"
            value={form.phoneNumber}
            onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
          />
          <Input
            placeholder="Email (optional)"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Button type="submit" variant="outline" className="col-span-2" disabled={adding}>
            {adding ? "Adding…" : "Add Emergency Contact"}
          </Button>
        </form>
      </CardContent>

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !deleting && !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove emergency contact?</DialogTitle>
            <DialogDescription>
              {deleteTarget && <>Remove {deleteTarget.name} as an emergency contact? This can&apos;t be undone.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? "Removing…" : "Remove Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
