"use client";

import { useState } from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  scanning?: boolean;
  className?: string;
};

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  scanning,
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  // Parse YYYY-MM-DD to Date
  const selected = value
    ? parse(value, "yyyy-MM-dd", new Date())
    : undefined;
  const validSelected = selected && isValid(selected) ? selected : undefined;

  function handleSelect(day: Date | undefined) {
    if (!day) return;
    onChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              !validSelected && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <span className="truncate">
          {validSelected ? format(validSelected, "MMM d, yyyy") : placeholder}
        </span>
        {scanning ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={validSelected}
          onSelect={handleSelect}
          captionLayout="dropdown"
          defaultMonth={validSelected ?? new Date()}
          disabled={{ after: new Date() }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
