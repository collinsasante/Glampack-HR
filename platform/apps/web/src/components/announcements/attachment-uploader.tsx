"use client";

import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { presignAnnouncementImage, uploadFileToS3 } from "@/lib/api/medical-claims";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Backed by the real `imageS3Key` field and the real S3 presign flow — a
// single optional image, not a general multi-file attachment system (the
// backend has no field for that yet). The bucket is private, so the preview
// for a freshly-picked file is a local blob URL (never touches S3 at all);
// the preview for an existing image (edit mode) is a short-lived signed URL
// the parent already has from fetching the announcement.
export function AttachmentUploader({
  s3Key,
  initialPreviewUrl,
  onChange,
  onUploadingChange,
}: {
  /** undefined = an existing image, untouched; null = no image / removed; string = freshly uploaded. */
  s3Key: string | null | undefined;
  initialPreviewUrl?: string | null;
  onChange: (s3Key: string | null) => void;
  /** Lets the parent form block submission until the upload finishes. */
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  // Revoke the blob URL when it's replaced or the component unmounts.
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

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

    setLocalPreviewUrl(URL.createObjectURL(file));
    setFileMeta({ name: file.name, size: file.size });
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const presign = await presignAnnouncementImage(file.type);
      await uploadFileToS3(presign, file);
      onChange(presign.s3Key);
    } catch {
      setError("Upload failed. Please try again.");
      setLocalPreviewUrl(null);
      setFileMeta(null);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  const previewUrl = localPreviewUrl ?? initialPreviewUrl;
  const hasImage = s3Key !== null && (typeof s3Key === "string" || !!initialPreviewUrl);

  if (hasImage || uploading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border p-3">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {uploading ? "Uploading…" : (fileMeta?.name ?? "Attached image")}
          </p>
          {fileMeta && !uploading && <p className="text-xs text-muted-foreground">{formatSize(fileMeta.size)}</p>}
        </div>
        {uploading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              onChange(null);
              setFileMeta(null);
              setLocalPreviewUrl(null);
            }}
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
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
        className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted"
      >
        <ImageIcon className="h-5 w-5" />
        <span className="flex items-center gap-1 font-medium text-foreground">
          <Upload className="h-3.5 w-3.5" /> Attach an image
        </span>
        <span className="text-xs">JPEG, PNG, GIF, or WEBP · up to 5MB</span>
      </button>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
