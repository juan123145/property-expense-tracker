"use client";

import { CATEGORIES } from "@/lib/categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Props = {
  category: string;
  subcategory: string;
  onCategoryChange: (cat: string) => void;
  onSubcategoryChange: (sub: string) => void;
};

export function CategorySelect({
  category,
  subcategory,
  onCategoryChange,
  onSubcategoryChange,
}: Props) {
  const selectedGroup = CATEGORIES.find((g) => g.name === category);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>Category</Label>
        <input type="hidden" name="category" value={category} />
        <Select
          value={category}
          onValueChange={(v) => {
            onCategoryChange(v ?? "");
            onSubcategoryChange("");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((g) => (
              <SelectItem key={g.name} value={g.name}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Subcategory</Label>
        <input type="hidden" name="subcategory" value={subcategory} />
        <Select
          value={subcategory}
          onValueChange={(v) => onSubcategoryChange(v ?? "")}
        >
          <SelectTrigger className="w-full" disabled={!selectedGroup}>
            <SelectValue
              placeholder={selectedGroup ? "Select subcategory" : "—"}
            />
          </SelectTrigger>
          <SelectContent>
            {selectedGroup?.subcategories.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
