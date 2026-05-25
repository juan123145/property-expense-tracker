"use client";

import { useActionState, useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
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
import { Plus, Trash2, ImageIcon, Loader2, X } from "lucide-react";

type Property = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  type: string | null;
  notes: string | null;
  imageUrl?: string | null;
};

type UnitRow = { id?: string; name: string; deleted: boolean };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property;
  existingUnits?: Array<{ id: string; name: string }>;
};

const PROPERTY_TYPES = ["Single Family", "Multi-Family", "Condo", "Commercial", "Other"];

// Types that auto-set to exactly 1 unit with no count picker
const SINGLE_UNIT_TYPES = new Set(["Single Family", "Condo"]);
// Types that require a count picker
const MULTI_UNIT_TYPES = new Set(["Multi-Family", "Commercial", "Other"]);

function defaultUnitRows(type: string, count: number): UnitRow[] {
  if (SINGLE_UNIT_TYPES.has(type)) {
    return [{ name: "Unit 1", deleted: false }];
  }
  if (MULTI_UNIT_TYPES.has(type) && count > 0) {
    return Array.from({ length: count }, (_, i) => ({ name: `Unit ${i + 1}`, deleted: false }));
  }
  return [];
}

export function AddPropertySheet({ open, onOpenChange, property, existingUnits = [] }: Props) {
  const isEdit = !!property;
  const action = isEdit ? updateProperty : createProperty;
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [propertyType, setPropertyType] = useState(property?.type ?? "");
  const [unitCount, setUnitCount] = useState(1);
  const [unitRows, setUnitRows] = useState<UnitRow[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(property?.imageUrl ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Reset all state when the sheet opens
  useEffect(() => {
    if (open) {
      const type = property?.type ?? "";
      setPropertyType(type);
      setImageUrl(property?.imageUrl ?? null);

      if (isEdit) {
        setUnitRows(existingUnits.map((u) => ({ id: u.id, name: u.name, deleted: false })));
        setUnitCount(existingUnits.length || 1);
      } else {
        const count = SINGLE_UNIT_TYPES.has(type) ? 1 : 1;
        setUnitCount(count);
        setUnitRows(defaultUnitRows(type, count));
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
      setImageUrl(null);
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  // When type changes (create mode only) — rebuild unit rows
  function handleTypeChange(newType: string | null) {
    const type = newType ?? "";
    setPropertyType(type);
    if (!isEdit) {
      if (SINGLE_UNIT_TYPES.has(type)) {
        setUnitCount(1);
        setUnitRows([{ name: "Unit 1", deleted: false }]);
      } else if (MULTI_UNIT_TYPES.has(type)) {
        setUnitRows(defaultUnitRows(type, unitCount));
      } else {
        setUnitRows([]);
      }
    }
  }

  // When count changes (create mode, multi-unit types)
  function handleCountChange(raw: string) {
    const n = Math.max(0, Math.min(50, parseInt(raw) || 0));
    setUnitCount(n);
    setUnitRows((prev) => {
      const visible = prev.filter((u) => !u.deleted);
      if (n > visible.length) {
        const additions = Array.from({ length: n - visible.length }, (_, i) => ({
          name: `Unit ${visible.length + i + 1}`,
          deleted: false,
        }));
        return [...prev, ...additions];
      } else {
        // trim from the end
        let removed = 0;
        return [...prev].reverse().map((u) => {
          if (!u.deleted && removed < visible.length - n) {
            removed++;
            return { ...u, deleted: true };
          }
          return u;
        }).reverse();
      }
    });
  }

  // Edit mode unit helpers
  function addUnit() {
    const visibleCount = unitRows.filter((u) => !u.deleted).length;
    setUnitRows((rows) => [...rows, { name: `Unit ${visibleCount + 1}`, deleted: false }]);
  }

  function removeUnit(index: number) {
    setUnitRows((rows) => rows.map((r, i) => (i === index ? { ...r, deleted: true } : r)));
  }

  function renameUnit(index: number, value: string) {
    setUnitRows((rows) => rows.map((r, i) => (i === index ? { ...r, name: value } : r)));
  }

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: 0.85,
      });
      const webpFile = new File([compressed], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
      const fd = new FormData();
      fd.append("file", webpFile);
      fd.append("folder", "properties");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
      } else {
        toast.error("Photo upload failed.");
      }
    } catch {
      toast.error("Photo upload failed.");
    } finally {
      setUploadingPhoto(false);
      // reset input so same file can be re-selected
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }, []);

  const visibleUnits = unitRows.map((u, i) => ({ ...u, _index: i })).filter((u) => !u.deleted);
  const showCountPicker = !isEdit && propertyType && MULTI_UNIT_TYPES.has(propertyType);
  const showUnitRows = propertyType !== "" && (isEdit || visibleUnits.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Property" : "Add Property"}</SheetTitle>
        </SheetHeader>
        <form ref={formRef} action={formAction} className="mt-6 space-y-4 px-4 pb-6">
          {isEdit && <input type="hidden" name="id" value={property.id} />}
          {isEdit && <input type="hidden" name="unitsJson" value={JSON.stringify(unitRows)} />}
          {!isEdit && <input type="hidden" name="unitsJson" value={JSON.stringify(unitRows.filter(u => !u.deleted))} />}
          <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />

          {/* Photo */}
          <div className="space-y-1.5">
            <Label>Property Photo</Label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border bg-muted/10 aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Property" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    Change
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0"
                    onClick={() => setImageUrl(null)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex flex-col items-center justify-center gap-2 w-full aspect-video rounded-lg border-2 border-dashed border-input hover:border-primary/50 hover:bg-muted/30 transition-colors text-muted-foreground"
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="size-6 animate-spin" />
                    <span className="text-xs">Uploading…</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="size-6" />
                    <span className="text-xs">Add a photo</span>
                  </>
                )}
              </button>
            )}
          </div>

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
              <Select value={propertyType} onValueChange={handleTypeChange}>
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

          {/* Units */}
          {(showCountPicker || showUnitRows || isEdit) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Units</Label>
                <span className="text-xs text-muted-foreground">
                  {visibleUnits.length} unit{visibleUnits.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Count picker — only for multi-unit types at create time */}
              {showCountPicker && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={unitCount}
                    onChange={(e) => handleCountChange(e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">units — name them below</span>
                </div>
              )}

              {/* Single-unit type note */}
              {!isEdit && SINGLE_UNIT_TYPES.has(propertyType) && (
                <p className="text-xs text-muted-foreground">
                  {propertyType} properties have 1 unit. You can rename it below.
                </p>
              )}

              {/* Unit rows */}
              {visibleUnits.length > 0 && (
                <div className="space-y-2">
                  {visibleUnits.map((unit, displayIdx) => (
                    <div key={unit._index} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">{displayIdx + 1}.</span>
                      <Input
                        value={unit.name}
                        onChange={(e) => renameUnit(unit._index, e.target.value)}
                        placeholder={`Unit ${displayIdx + 1}`}
                        className="h-8 text-sm"
                      />
                      {/* Allow delete only in edit mode, or in create mode for multi-unit types */}
                      {(isEdit || MULTI_UNIT_TYPES.has(propertyType)) && (
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
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add unit button — edit mode only */}
              {isEdit && (
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
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" defaultValue={property?.notes ?? ""} placeholder="Optional notes" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending || uploadingPhoto} className="flex-1">
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
