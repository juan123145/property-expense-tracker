"use client";

import { useState } from "react";
import { ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  category: string;
  subcategory: string;
  onCategoryChange: (cat: string) => void;
  onSubcategoryChange: (sub: string) => void;
};

export function CategoryPicker({
  category,
  subcategory,
  onCategoryChange,
  onSubcategoryChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const hoveredGroup = CATEGORIES.find((g) => g.name === hovered);

  const displayLabel = category
    ? subcategory
      ? `${category} · ${subcategory}`
      : category
    : "Select category";

  function handleOpenChange(v: boolean) {
    if (v) setHovered(category || null);
    setOpen(v);
  }

  function selectSubcategory(cat: string, sub: string) {
    onCategoryChange(cat);
    onSubcategoryChange(sub);
    setOpen(false);
  }

  return (
    <>
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="subcategory" value={subcategory} />
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm ring-offset-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          }
        >
          <span className={cn("truncate", !category && "text-muted-foreground")}>
            {displayLabel}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-[480px] p-0" align="start">
          <div className="flex h-[320px]">
            {/* Left: category list — hover to preview, click to highlight only */}
            <div className="w-[200px] shrink-0 border-r border-border overflow-y-auto">
              {CATEGORIES.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors",
                    (hovered === g.name || (!hovered && category === g.name)) && "bg-accent font-medium"
                  )}
                  onMouseEnter={() => setHovered(g.name)}
                  onClick={() => setHovered(g.name)}
                >
                  <span className="truncate">{g.name}</span>
                  <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground ml-1" />
                </button>
              ))}
            </div>
            {/* Right: subcategory list — click to select both */}
            <div className="flex-1 overflow-y-auto p-1">
              {hoveredGroup ? (
                hoveredGroup.subcategories.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    className={cn(
                      "flex w-full items-center rounded-md px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors",
                      category === hoveredGroup.name &&
                        subcategory === sub &&
                        "bg-accent font-medium"
                    )}
                    onClick={() => selectSubcategory(hoveredGroup.name, sub)}
                  >
                    {sub}
                  </button>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
                  Hover a category to see options
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
