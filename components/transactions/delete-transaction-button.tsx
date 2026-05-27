"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTransaction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteTransactionDialog({ id, open, onOpenChange }: Props) {
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteTransaction(id);
        toast.success("Transaction moved to trash.");
        onOpenChange(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        toast.error(message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete transaction?</DialogTitle>
          <DialogDescription>
            This transaction will be moved to Trash. You can restore it later.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useDeleteDialog() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  return {
    deleteId,
    openDelete: (id: string) => setDeleteId(id),
    closeDelete: () => setDeleteId(null),
  };
}
