"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, MapPin, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddPropertySheet } from "@/components/properties/add-property-sheet";

type Property = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  type: string | null;
  isArchived: boolean | null;
  unitCount: number;
  totalExpenses: number;
};

type Props = {
  activeProperties: Property[];
  archivedProperties: Property[];
};

function PropertyCard({ property }: { property: Property }) {
  const location = [property.city, property.state].filter(Boolean).join(", ");
  return (
    <Link
      href={`/properties/${property.id}`}
      className="flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="size-5 shrink-0 text-muted-foreground" />
          <span className="font-medium truncate">{property.name}</span>
        </div>
        {property.type && (
          <Badge variant="secondary" className="shrink-0 text-xs">{property.type}</Badge>
        )}
      </div>
      {(property.address || location) && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">
            {[property.address, location].filter(Boolean).join(", ")}
          </span>
        </div>
      )}
      <div className="flex gap-4 text-sm pt-1 border-t">
        <div>
          <span className="text-muted-foreground">Units </span>
          <span className="font-medium">{property.unitCount}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total Expenses </span>
          <span className="font-medium">
            ${property.totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function PropertiesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
    </div>
  );
}

export function PropertiesClient({ activeProperties, archivedProperties }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Properties</h1>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add Property
        </Button>
      </div>

      {activeProperties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border rounded-lg bg-muted/30">
          <Building2 className="size-12 text-muted-foreground" />
          <div>
            <p className="font-medium">No properties yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first property to get started.</p>
          </div>
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="size-4 mr-2" />
            Add Property
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeProperties.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}

      {archivedProperties.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`size-4 transition-transform ${showArchived ? "rotate-180" : ""}`} />
            {archivedProperties.length} archived {archivedProperties.length === 1 ? "property" : "properties"}
          </button>
          {showArchived && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              {archivedProperties.map((p) => (
                <div key={p.id} className="relative opacity-60">
                  <PropertyCard property={p} />
                  <Badge variant="outline" className="absolute top-3 right-3 text-xs">Archived</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AddPropertySheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
