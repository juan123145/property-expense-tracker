"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { Upload, X, FileText, ImageIcon, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPTED = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};
const MAX_SIZE = 10 * 1024 * 1024;
const COMPRESS_THRESHOLD = 250 * 1024;
const MAX_FILES = 3;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageUrl(name: string | null | undefined): boolean {
  return /\.(jpg|jpeg|png|webp)$/i.test(name ?? "");
}

async function renderPdfThumbnail(file: File): Promise<string | null> {
  try {
    const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
    GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
}

// ─── FileCard: new pending file ──────────────────────────────────────────────

function FileCard({
  file,
  label,
  onRemove,
  isScanning,
}: {
  file: File;
  label?: string;
  onRemove: () => void;
  isScanning?: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isPdf = file.type === "application/pdf";
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (isPdf) {
      let cancelled = false;
      renderPdfThumbnail(file).then((url) => {
        if (!cancelled) setPreviewUrl(url);
      });
      return () => { cancelled = true; };
    }
  }, [file, isImage, isPdf]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
        {isPdf ? (
          <FileText className="size-5 text-muted-foreground shrink-0" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {label && <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>}
          <p className="text-sm font-medium truncate">{file.name}</p>
          {isScanning ? (
            <p className="text-xs text-blue-600">Scanning receipt…</p>
          ) : (
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
          onClick={onRemove}
          aria-label="Remove file"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      {previewUrl && (
        <div className="rounded-lg overflow-hidden border bg-muted/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={label ?? "Receipt preview"}
            className="w-full object-contain max-h-56"
          />
        </div>
      )}
    </div>
  );
}

// ─── ExistingCard: already-saved attachment ──────────────────────────────────

function ExistingCard({
  url,
  name,
  sizeKb,
  label,
  onRemove,
}: {
  url: string;
  name: string | null;
  sizeKb: number | null;
  label?: string;
  onRemove: () => void;
}) {
  const isImage = isImageUrl(name);
  const isPdf = !isImage && (name?.toLowerCase().endsWith(".pdf") || url.includes(".pdf"));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
        {isPdf ? (
          <FileText className="size-5 text-muted-foreground shrink-0" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {label && <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>}
          <p className="text-sm font-medium truncate">{name ?? "Receipt"}</p>
          {sizeKb && (
            <p className="text-xs text-muted-foreground">{formatBytes(sizeKb * 1024)}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
          onClick={onRemove}
          aria-label="Remove attachment"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      {isImage && (
        <div className="rounded-lg overflow-hidden border bg-muted/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={name ?? "Receipt"}
            className="w-full object-contain max-h-56"
          />
        </div>
      )}
      {isPdf && (
        <div className="rounded-lg overflow-hidden border bg-muted/10" style={{ height: 200 }}>
          <iframe src={url} className="w-full h-full border-0" title={name ?? "Receipt PDF"} />
        </div>
      )}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export type ExistingAttachment = {
  id: string;
  url: string;
  name: string | null;
  sizeKb: number | null;
};

type Props = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingAttachments?: ExistingAttachment[];
  onRemoveExisting?: (id: string) => void;
  scanning?: boolean;
};

// ─── Main component ───────────────────────────────────────────────────────────

export function ReceiptUploadZone({
  files,
  onFilesChange,
  existingAttachments = [],
  onRemoveExisting,
  scanning = false,
}: Props) {
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const compressingRef = useRef(false);

  const totalCount = existingAttachments.length + files.length;
  const canAddMore = totalCount < MAX_FILES;

  const handleFile = useCallback(
    async (raw: File) => {
      setError(null);
      if (raw.type.startsWith("image/") && raw.size > COMPRESS_THRESHOLD) {
        setCompressing(true);
        compressingRef.current = true;
        try {
          const compressed = await imageCompression(raw, {
            maxSizeMB: 0.25,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
          });
          onFilesChange([...files, new File([compressed], raw.name, { type: compressed.type })]);
        } catch {
          onFilesChange([...files, raw]);
        } finally {
          setCompressing(false);
          compressingRef.current = false;
        }
      } else {
        onFilesChange([...files, raw]);
      }
    },
    [files, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: !canAddMore || compressing,
    onDropAccepted: ([f]) => handleFile(f),
    onDropRejected: (rejs) => {
      const code = rejs[0]?.errors[0]?.code;
      if (code === "file-too-large") setError("File exceeds 10 MB.");
      else if (code === "file-invalid-type") setError("Only JPEG, PNG, WEBP, or PDF allowed.");
      else setError("File rejected.");
    },
  });

  const showDropzone = totalCount === 0;
  const showAddMore = totalCount > 0 && canAddMore;
  const multiLabel = totalCount > 1;

  return (
    <div className="space-y-3">

      {/* Already-saved attachments */}
      {existingAttachments.map((a, i) => (
        <ExistingCard
          key={a.id}
          url={a.url}
          name={a.name}
          sizeKb={a.sizeKb}
          label={multiLabel ? `Saved receipt ${i + 1}` : undefined}
          onRemove={() => onRemoveExisting?.(a.id)}
        />
      ))}

      {/* Pending new files */}
      {files.map((f, i) => (
        <FileCard
          key={`${f.name}-${f.size}-${i}`}
          file={f}
          label={multiLabel ? `New receipt ${existingAttachments.length + i + 1}` : undefined}
          isScanning={scanning && i === files.length - 1}
          onRemove={() => onFilesChange(files.filter((_, idx) => idx !== i))}
        />
      ))}

      {/* Compressing indicator */}
      {compressing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Loader2 className="size-3.5 animate-spin shrink-0" />
          Compressing image…
        </div>
      )}

      {/* Primary dropzone (when no files yet) */}
      {showDropzone && (
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-input hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="size-7 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {isDragActive ? "Drop to attach" : "Drag & drop or click to attach"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, WEBP or PDF · max 10 MB</p>
          </div>
        </div>
      )}

      {/* "Add another receipt" button */}
      {showAddMore && (
        <div
          {...getRootProps()}
          className={`flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 cursor-pointer text-sm text-muted-foreground transition-colors ${
            isDragActive ? "border-primary bg-primary/5 text-primary" : "border-input hover:border-primary/50 hover:text-foreground hover:bg-muted/20"
          } ${compressing ? "pointer-events-none opacity-50" : ""}`}
        >
          <input {...getInputProps()} />
          <PlusCircle className="size-4 shrink-0" />
          Add another receipt
        </div>
      )}

      {(error || fileRejections.length > 0) && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
