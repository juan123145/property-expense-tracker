"use client";

import { useState, useTransition } from "react";
import { Download, Trash2, FileText, X } from "lucide-react";
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
import { clearAttachment } from "@/app/actions/transactions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  url: string;
  filename: string | null;
  sizeKb: number | null;
  onDeleted: () => void;
};

function formatBytes(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function AttachmentViewer({
  open,
  onOpenChange,
  transactionId,
  url,
  filename,
  sizeKb,
  onDeleted,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPdf = filename?.toLowerCase().endsWith(".pdf") ?? url.includes(".pdf");

  function handleDelete() {
    startTransition(async () => {
      try {
        await clearAttachment(transactionId);
        toast.success("Receipt removed.");
        setConfirmOpen(false);
        onOpenChange(false);
        onDeleted();
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
                  {filename ?? "Receipt"}
                </SheetTitle>
                {sizeKb && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(sizeKb)}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <a
                  href={url}
                  download={filename ?? "receipt"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent transition-colors"
                >
                  <Download className="size-3.5" />
                  Download
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Remove
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden bg-muted/20">
            {isPdf ? (
              <iframe
                src={url}
                className="w-full h-full border-0"
                title={filename ?? "Receipt PDF"}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={filename ?? "Receipt"}
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
            <AlertDialogTitle>Remove receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the attached file. The transaction itself will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
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
