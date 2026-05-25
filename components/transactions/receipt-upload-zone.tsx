"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { Upload, X, FileText, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPTED = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};
const MAX_SIZE = 10 * 1024 * 1024;
const COMPRESS_THRESHOLD = 250 * 1024; // compress images above 250 KB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type SizeInfo = { original: number; compressed: number };

type Props = {
  file: File | null;
  onFileChange: (f: File | null) => void;
  existingUrl?: string | null;
  existingName?: string | null;
  existingSizeKb?: number | null;
  onClear?: () => void;
  scanning?: boolean;
};

export function ReceiptUploadZone({
  file,
  onFileChange,
  existingUrl,
  existingName,
  existingSizeKb,
  onClear,
  scanning = false,
}: Props) {
  const [compressing, setCompressing] = useState(false);
  const [sizeInfo, setSizeInfo] = useState<SizeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (raw: File) => {
      setError(null);
      setSizeInfo(null);

      if (raw.type.startsWith("image/") && raw.size > COMPRESS_THRESHOLD) {
        setCompressing(true);
        try {
          const compressed = await imageCompression(raw, {
            maxSizeMB: 0.25,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
          });
          setSizeInfo({ original: raw.size, compressed: compressed.size });
          onFileChange(new File([compressed], raw.name, { type: compressed.type }));
        } catch {
          onFileChange(raw);
          setSizeInfo({ original: raw.size, compressed: raw.size });
        } finally {
          setCompressing(false);
        }
      } else {
        setSizeInfo({ original: raw.size, compressed: raw.size });
        onFileChange(raw);
      }
    },
    [onFileChange]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    multiple: false,
    onDropAccepted: ([f]) => handleFile(f),
    onDropRejected: (rejs) => {
      const code = rejs[0]?.errors[0]?.code;
      if (code === "file-too-large") setError("File exceeds 10 MB.");
      else if (code === "file-invalid-type") setError("Only JPEG, PNG, WEBP, or PDF allowed.");
      else setError("File rejected.");
    },
  });

  // Show existing attachment (edit mode, no new file selected)
  if (existingUrl && !file) {
    const isPdf = existingName?.toLowerCase().endsWith(".pdf");
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
        {isPdf ? (
          <FileText className="size-5 text-muted-foreground shrink-0" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{existingName ?? "Receipt"}</p>
          {existingSizeKb && (
            <p className="text-xs text-muted-foreground">{formatBytes(existingSizeKb * 1024)}</p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              // Switch to dropzone to replace
              onClear?.();
            }}
          >
            Replace
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={onClear}
            aria-label="Remove attachment"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Show newly selected file
  if (file) {
    const isPdf = file.type === "application/pdf";
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
          {compressing ? (
            <Loader2 className="size-5 text-muted-foreground shrink-0 animate-spin" />
          ) : isPdf ? (
            <FileText className="size-5 text-muted-foreground shrink-0" />
          ) : (
            <ImageIcon className="size-5 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            {compressing && (
              <p className="text-xs text-muted-foreground">Compressing…</p>
            )}
            {!compressing && scanning && (
              <p className="text-xs text-blue-600">Scanning receipt…</p>
            )}
            {!compressing && !scanning && sizeInfo && sizeInfo.compressed < sizeInfo.original && (
              <p className="text-xs text-muted-foreground">
                {formatBytes(sizeInfo.original)} → {formatBytes(sizeInfo.compressed)}{" "}
                <span className="text-green-600">
                  (saved {Math.round((1 - sizeInfo.compressed / sizeInfo.original) * 100)}%)
                </span>
              </p>
            )}
            {!compressing && !scanning && sizeInfo && sizeInfo.compressed >= sizeInfo.original && (
              <p className="text-xs text-muted-foreground">
                {formatBytes(sizeInfo.compressed)} — no compression needed
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => {
              onFileChange(null);
              setSizeInfo(null);
              setError(null);
            }}
            aria-label="Remove file"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Dropzone
  return (
    <div className="space-y-1.5">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-input hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="size-6 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            {isDragActive ? "Drop to attach" : "Attach receipt"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            JPEG, PNG, WEBP or PDF · max 10 MB
          </p>
        </div>
      </div>
      {(error || fileRejections.length > 0) && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
