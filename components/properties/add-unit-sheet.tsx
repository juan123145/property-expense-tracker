"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createUnit } from "@/app/actions/units";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
};

export function AddUnitSheet({ open, onOpenChange, propertyId }: Props) {
  const [state, formAction, pending] = useActionState(createUnit, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Unit added.");
      onOpenChange(false);
      formRef.current?.reset();
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Add Unit</SheetTitle>
        </SheetHeader>
        <form ref={formRef} action={formAction} className="mt-6 space-y-4 px-4 pb-6">
          <input type="hidden" name="propertyId" value={propertyId} />
          <div className="space-y-1.5">
            <Label htmlFor="name">Unit Name / Number *</Label>
            <Input id="name" name="name" required placeholder="e.g. Unit 1A or Apt 2B" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Adding…" : "Add Unit"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
