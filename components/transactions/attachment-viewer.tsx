"use client";

import { useState, useTransition } from "react";
import { Download, Trash2, Loader2, FileText, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { clearAttachment, deleteTransactionAttachment } from "@/app/actions/transactions";
import { cn } from "@/lib/utils";

type Attachment = {
  id: string;
  url: string;
  name: string | null;
  sizeKb: number | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  attachments: Attachment[];
  onDeleted: () => void;
};

function formatBytes(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function isImage(filename: string | null): boolean {
  return /\.(jpg|jpeg|png|webp)$/i.test(filename ?? "");
}

export function AttachmentViewer({
  open,
  onOpenChange,
  transactionId,
  attachments,
  onDeleted,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"all" | "one">("all");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selected = attachments[Math.min(selectedIdx, attachments.length - 1)];
  if (!selected) return null;

  const isPdf = !!selected.name?.toLowerCase().endsWith(".pdf") || (!isImage(selected.name) && selected.url.includes(".pdf"));

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const res = await fetch(selected.url);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = selected.name ?? "receipt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  function handleDeleteAll() {
    setConfirmMode("all");
    setConfirmOpen(true);
  }

  function handleDeleteOne() {
    setConfirmMode("one");
    setConfirmOpen(true);
  }

  function confirmDelete() {
    startTransition(async () => {
      try {
        if (confirmMode === "all") {
          await clearAttachment(transactionId);
          toast.success("All receipts removed.");
          setConfirmOpen(false);
          onOpenChange(false);
          onDeleted();
        } else {
          await deleteTransactionAttachment(selected.id);
          toast.success("Receipt removed.");
          setConfirmOpen(false);
          if (attachments.length <= 1) {
            onOpenChange(false);
            onDeleted();
          } else {
            setSelectedIdx(0);
            onDeleted();
          }
        }
      } catch {
        toast.error("Failed to remove receipt.");
      }
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="truncate text-base">
                  {attachments.length > 1
                    ? `${attachments.length} Receipts`
                    : (selected.name ?? "Receipt")}
                </SheetTitle>
                {selected.sizeKb && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(selected.sizeKb)}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <Download className="size-3.5" />}
                  Download
                </Button>
                {attachments.length > 1 ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                      onClick={handleDeleteOne}
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Remove this
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                      onClick={handleDeleteAll}
                    >
                      Remove all
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                    onClick={handleDeleteAll}
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {/* Attachment tabs (multi only) */}
            {attachments.length > 1 && (
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {attachments.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                      selectedIdx === i
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-input hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {isImage(a.name)
                      ? <ImageIcon className="size-3" />
                      : <FileText className="size-3" />}
                    Receipt {i + 1}
                  </button>
                ))}
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-hidden bg-muted/20">
            {isPdf ? (
              <iframe
                src={selected.url}
                className="w-full h-full border-0"
                title={selected.name ?? "Receipt PDF"}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.url}
                  alt={selected.name ?? "Receipt"}
                  className="max-w-full max-h-full object-contain rounded-md shadow-sm"
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmMode === "all" ? "Remove all receipts?" : "Remove this receipt?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMode === "all"
                ? "This will permanently delete all attached files. The transaction itself will not be affected."
                : "This will permanently delete this receipt. The transaction itself will not be affected."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
