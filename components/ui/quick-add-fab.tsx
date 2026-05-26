"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { AddTransactionSheet } from "@/components/transactions/add-transaction-sheet";

type Property = { id: string; name: string };
type Unit = { id: string; propertyId: string | null; name: string };

type Props = {
  properties: Property[];
  allUnits: Unit[];
};

export function QuickAddFAB({ properties, allUnits }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (!pathname.startsWith("/transactions")) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Add transaction"
        className="md:hidden fixed bottom-24 right-4 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
      >
        <Plus className="size-6" />
      </button>

      <AddTransactionSheet
        key={open ? "fab-open" : "fab-closed"}
        open={open}
        onOpenChange={setOpen}
        properties={properties}
        allUnits={allUnits}
      />
    </>
  );
}
