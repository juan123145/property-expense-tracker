"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveProperty } from "@/app/actions/properties";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Archive, ArchiveRestore } from "lucide-react";

type Props = {
  propertyId: string;
  isArchived: boolean;
};

export function ArchivePropertyButton({ propertyId, isArchived }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await archiveProperty(propertyId, !isArchived);
        toast.success(isArchived ? "Property restored." : "Property archived.");
        setOpen(false);
      } catch {
        toast.error("Something went wrong.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm">
          {isArchived ? (
            <><ArchiveRestore className="size-4 mr-2" />Restore Property</>
          ) : (
            <><Archive className="size-4 mr-2" />Archive Property</>
          )}
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isArchived ? "Restore property?" : "Archive property?"}</DialogTitle>
          <DialogDescription>
            {isArchived
              ? "This will move the property back to your active list. All data is preserved."
              : "Archiving this property will hide it from your active list. All data is preserved."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={pending}>
            {pending ? "Please wait…" : isArchived ? "Restore" : "Archive"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
