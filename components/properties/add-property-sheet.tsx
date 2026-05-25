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
import { Plus, Trash2 } from "lucide-react";

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

type UnitRow = { id?: string; name: string; deleted: boolean };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property;
  existingUnits?: Array<{ id: string; name: string }>;
};

const PROPERTY_TYPES = ["Single Family", "Multi-Family", "Condo", "Commercial", "Other"];

export function AddPropertySheet({ open, onOpenChange, property, existingUnits = [] }: Props) {
  const isEdit = !!property;
  const action = isEdit ? updateProperty : createProperty;
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [propertyType, setPropertyType] = useState(property?.type ?? "");
  const [unitRows, setUnitRows] = useState<UnitRow[]>([]);

  // Reset unit rows when sheet opens/closes or property changes
  useEffect(() => {
    if (open) {
      setPropertyType(property?.type ?? "");
      if (isEdit) {
        setUnitRows(existingUnits.map((u) => ({ id: u.id, name: u.name, deleted: false })));
      } else {
        setUnitRows([]);
      }
    }
  }, [open, property, isEdit, existingUnits]);

  useEffect(() => {
    if (state?.success) {
      toast.success(isEdit ? "Property updated." : "Property added.");
      onOpenChange(false);
      formRef.current?.reset();
      setPropertyType("");
      setUnitRows([]);
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  function addUnit() {
    const visibleCount = unitRows.filter((u) => !u.deleted).length;
    setUnitRows((rows) => [...rows, { name: `Unit ${visibleCount + 1}`, deleted: false }]);
  }

  function removeUnit(index: number) {
    setUnitRows((rows) =>
      rows.map((r, i) => {
        if (i !== index) return r;
        // Existing unit: mark deleted; new unit: remove entirely
        return r.id ? { ...r, deleted: true } : { ...r, deleted: true };
      })
    );
  }

  function renameUnit(index: number, value: string) {
    setUnitRows((rows) => rows.map((r, i) => (i === index ? { ...r, name: value } : r)));
  }

  const visibleUnits = unitRows.map((u, i) => ({ ...u, _index: i })).filter((u) => !u.deleted);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Property" : "Add Property"}</SheetTitle>
        </SheetHeader>
        <form ref={formRef} action={formAction} className="mt-6 space-y-4 px-4 pb-6">
          {isEdit && <input type="hidden" name="id" value={property.id} />}
          {isEdit && (
            <input type="hidden" name="unitsJson" value={JSON.stringify(unitRows)} />
          )}

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

          {/* Units section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Units</Label>
              {isEdit && (
                <span className="text-xs text-muted-foreground">
                  {visibleUnits.length} unit{visibleUnits.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {isEdit ? (
              <>
                {visibleUnits.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1">No units yet. Add one below.</p>
                )}
                <div className="space-y-2">
                  {visibleUnits.map((unit) => (
                    <div key={unit._index} className="flex items-center gap-2">
                      <Input
                        value={unit.name}
                        onChange={(e) => renameUnit(unit._index, e.target.value)}
                        placeholder="Unit name"
                        className="h-8 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeUnit(unit._index)}
                        aria-label="Remove unit"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs h-8"
                  onClick={addUnit}
                >
                  <Plus className="size-3.5" />
                  Add unit
                </Button>
              </>
            ) : (
              <>
                <Input
                  id="numberOfUnits"
                  name="numberOfUnits"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="0"
                />
                <p className="text-xs text-muted-foreground">
                  Units will be created automatically (Unit 1, Unit 2…)
                </p>
              </>
            )}
          </div>

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
