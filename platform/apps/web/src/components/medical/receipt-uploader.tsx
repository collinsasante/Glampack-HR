"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { presignMedicalReceipt, uploadFileToS3 } from "@/lib/api/medical-claims";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

export interface PendingReceipt {
  filename: string;
  size: number;
  s3Key: string;
  url: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Real multi-file upload backed by the actual S3 presign flow and the
// MedicalClaim.receipts one-to-many relation — every file listed here becomes
// a real receipt row once the claim is submitted.
export function ReceiptUploader({
  receipts,
  onChange,
  onUploadingChange,
}: {
  receipts: PendingReceipt[];
  onChange: (receipts: PendingReceipt[]) => void;
  /** Lets the parent form block submission until any in-flight upload finishes. */
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setError(null);
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Only JPEG, PNG, GIF, WEBP, or PDF files are supported.");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError("Each file must be 5MB or smaller.");
        continue;
      }
      setUploading(true);
      onUploadingChange?.(true);
      try {
        const presign = await presignMedicalReceipt(file.type);
        await uploadFileToS3(presign, file);
        onChange([...receipts, { filename: file.name, size: file.size, s3Key: presign.s3Key, url: presign.publicUrl }]);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
        onUploadingChange?.(false);
      }
    }
  }

  return (
    <div className="space-y-2">
      {receipts.map((r, i) => (
        <div key={r.s3Key} className="flex items-center gap-3 rounded-lg border border-border p-3">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{r.filename}</p>
            <p className="text-xs text-muted-foreground">{formatSize(r.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(receipts.filter((_, idx) => idx !== i))}
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-border py-5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Upload className="h-3.5 w-3.5" /> Attach receipts
            </span>
            <span className="text-xs">JPEG, PNG, GIF, PDF · up to 5MB each</span>
          </>
        )}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
