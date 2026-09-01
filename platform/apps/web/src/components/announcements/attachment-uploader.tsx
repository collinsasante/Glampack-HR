"use client";

import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { presignAnnouncementImage, uploadFileToS3 } from "@/lib/api/medical-claims";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Backed by the real `imageUrl` field and the real S3 presign flow — this is a
// single optional image, not a general multi-file attachment system (the
// backend has no field for that yet).
export function AttachmentUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, GIF, or WEBP images are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be 5MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const presign = await presignAnnouncementImage(file.type);
      await uploadFileToS3(presign, file);
      setFileMeta({ name: file.name, size: file.size });
      onChange(presign.publicUrl);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" className="h-12 w-12 rounded-md object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{fileMeta?.name ?? "Attached image"}</p>
          {fileMeta && <p className="text-xs text-muted-foreground">{formatSize(fileMeta.size)}</p>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            onChange(null);
            setFileMeta(null);
          }}
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <ImageIcon className="h-5 w-5" />
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Upload className="h-3.5 w-3.5" /> Attach an image
            </span>
            <span className="text-xs">JPEG, PNG, GIF, or WEBP · up to 5MB</span>
          </>
        )}
      </button>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
