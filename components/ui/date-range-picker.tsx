"use client";

import { useState } from "react";
import { CalendarDays, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import {
  DATE_PRESET_OPTIONS,
  DatePreset,
  getPresetRange,
  presetDisplayLabel,
} from "@/lib/date-ranges";
import { cn } from "@/lib/utils";

export type DateRangeValue = {
  preset: DatePreset;
  start: string;
  end: string;
};

export const DATE_RANGE_ALL: DateRangeValue = { preset: "all", start: "", end: "" };

type Props = {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  className?: string;
};

const PRESET_ROWS: (typeof DATE_PRESET_OPTIONS[number]["id"])[][] = [
  ["mtd", "last-month"],
  ["ytd", "last-12"],
  ["last-cal-year"],
];

export function DateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeValue>(value);

  function openPicker() {
    setDraft(value);
    setOpen(true);
  }

  function selectPreset(preset: typeof DATE_PRESET_OPTIONS[number]["id"]) {
    const range = getPresetRange(preset);
    setDraft({ preset, start: range.start, end: range.end });
  }

  function apply() {
    // If custom but incomplete, fall back to "all"
    const resolved =
      draft.preset === "custom" && (!draft.start || !draft.end)
        ? DATE_RANGE_ALL
        : draft;
    onChange(resolved);
    setOpen(false);
  }

  function cancel() {
    setOpen(false);
  }

  const label = presetDisplayLabel(value.preset, value.start, value.end);
  const isActive = value.preset !== "all";

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap",
          isActive
            ? "border-primary bg-primary/5 text-primary"
            : "border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
          className
        )}
      >
        <CalendarDays className="size-3.5 shrink-0" />
        {label}
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) cancel(); }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogTitle className="text-base font-semibold">Date Range</DialogTitle>

          {/* Preset pills */}
          <div className="space-y-2">
            {PRESET_ROWS.map((row, i) => (
              <div key={i} className="flex gap-2">
                {row.map((presetId) => {
                  const isSelected = draft.preset === presetId;
                  const opt = DATE_PRESET_OPTIONS.find((o) => o.id === presetId)!;
                  return (
                    <button
                      key={presetId}
                      type="button"
                      onClick={() => selectPreset(presetId)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-all",
                        isSelected
                          ? "bg-primary/10 border-primary text-primary"
                          : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      {isSelected && <Check className="size-3.5 shrink-0" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Custom date inputs */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <DatePickerInput
                value={draft.start}
                onChange={(v) => setDraft({ preset: "custom", start: v, end: draft.end })}
                placeholder="Start"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">End Date</label>
              <DatePickerInput
                value={draft.end}
                onChange={(v) => setDraft({ preset: "custom", start: draft.start, end: v })}
                placeholder="End"
                className="h-9"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1 h-10" onClick={cancel}>
              Cancel
            </Button>
            <Button className="flex-1 h-10" onClick={apply}>
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
