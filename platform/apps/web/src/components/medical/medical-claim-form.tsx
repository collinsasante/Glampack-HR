"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ReceiptUploader, type PendingReceipt } from "@/components/medical/receipt-uploader";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/apiClient";
import { createMedicalClaim } from "@/lib/api/medical-claims";

const EMPTY_FORM = { dateOfVisit: "", hospitalClinicName: "", descriptionOfTreatment: "", amountSpent: "" };

export function MedicalClaimForm({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [receipts, setReceipts] = useState<PendingReceipt[]>([]);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setForm(EMPTY_FORM);
    setReceipts([]);
    setUploadingReceipt(false);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createMedicalClaim({
        dateOfVisit: new Date(form.dateOfVisit),
        hospitalClinicName: form.hospitalClinicName,
        descriptionOfTreatment: form.descriptionOfTreatment,
        amountSpent: Number(form.amountSpent),
        receiptKeys: receipts.map((r) => ({ s3Key: r.s3Key, filename: r.filename, url: r.url })),
      });
      toast.success("Medical claim submitted successfully.", {
        description: "HR will review it and update the status.",
      });
      reset();
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit claim");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Medical Claim</DialogTitle>
          <DialogDescription>
            Submit a reimbursement claim for a medical expense. HR will review it and update its status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfVisit">Date of Visit</Label>
              <Input
                id="dateOfVisit"
                type="date"
                required
                value={form.dateOfVisit}
                onChange={(e) => setForm((f) => ({ ...f, dateOfVisit: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountSpent">Amount Spent (GH₵)</Label>
              <Input
                id="amountSpent"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.amountSpent}
                onChange={(e) => setForm((f) => ({ ...f, amountSpent: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="hospitalClinicName">Hospital / Clinic Name</Label>
              <Input
                id="hospitalClinicName"
                required
                value={form.hospitalClinicName}
                onChange={(e) => setForm((f) => ({ ...f, hospitalClinicName: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="descriptionOfTreatment">Description of Treatment</Label>
              <Textarea
                id="descriptionOfTreatment"
                required
                rows={3}
                value={form.descriptionOfTreatment}
                onChange={(e) => setForm((f) => ({ ...f, descriptionOfTreatment: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Receipts</Label>
            <ReceiptUploader receipts={receipts} onChange={setReceipts} onUploadingChange={setUploadingReceipt} />
          </div>

          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Medical information is confidential and only visible to you and HR/Admin.
          </p>

          {error && <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || uploadingReceipt}>
              {submitting ? "Submitting…" : uploadingReceipt ? "Waiting for upload…" : "Submit Claim"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
