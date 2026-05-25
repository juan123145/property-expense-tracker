"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { AddPropertySheet } from "@/components/properties/add-property-sheet";
import { ArchivePropertyButton } from "@/components/properties/archive-property-button";

type Property = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  type: string | null;
  notes: string | null;
  isArchived: boolean | null;
  imageUrl?: string | null;
};

type Unit = { id: string; name: string };

type Props = {
  property: Property;
  units: Unit[];
};

export function PropertyDetailClient({ property, units }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4 mr-2" />
          Edit Property
        </Button>
        <ArchivePropertyButton propertyId={property.id} isArchived={property.isArchived ?? false} />
      </div>

      <AddPropertySheet
        open={editOpen}
        onOpenChange={setEditOpen}
        property={property}
        existingUnits={units}
      />
    </>
  );
}
