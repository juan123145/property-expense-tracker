"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createProperty, updateProperty } from "@/app/actions/properties";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Property = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  type: string | null;
  notes: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property;
};

const PROPERTY_TYPES = ["Single Family", "Multi-Family", "Condo", "Commercial", "Other"];

export function AddPropertySheet({ open, onOpenChange, property }: Props) {
  const isEdit = !!property;
  const action = isEdit ? updateProperty : createProperty;
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [propertyType, setPropertyType] = useState(property?.type ?? "");

  useEffect(() => {
    if (state?.success) {
      toast.success(isEdit ? "Property updated." : "Property added.");
      onOpenChange(false);
      formRef.current?.reset();
      setPropertyType("");
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  useEffect(() => {
    if (open) setPropertyType(property?.type ?? "");
  }, [open, property]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Property" : "Add Property"}</SheetTitle>
        </SheetHeader>
        <form ref={formRef} action={formAction} className="mt-6 space-y-4 px-4 pb-6">
          {isEdit && <input type="hidden" name="id" value={property.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="name">Property Name *</Label>
            <Input id="name" name="name" required defaultValue={property?.name} placeholder="e.g. Main Street Duplex" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={property?.address ?? ""} placeholder="123 Main St" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={property?.city ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue={property?.state ?? ""} placeholder="FL" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input id="zip" name="zip" defaultValue={property?.zip ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Property Type</Label>
              <input type="hidden" name="type" value={propertyType} />
              <Select value={propertyType} onValueChange={(v) => setPropertyType(v ?? "")}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="numberOfUnits">Number of Units</Label>
              <Input id="numberOfUnits" name="numberOfUnits" type="number" min="0" max="100" defaultValue="0" />
              <p className="text-xs text-muted-foreground">Units will be created automatically (Unit 1, Unit 2…)</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" defaultValue={property?.notes ?? ""} placeholder="Optional notes" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Saving…" : isEdit ? "Save Changes" : "Add Property"}
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
