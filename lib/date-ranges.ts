export type DatePreset =
  | "all"
  | "mtd"
  | "last-month"
  | "ytd"
  | "last-12"
  | "last-cal-year"
  | "custom";

export const DATE_PRESET_OPTIONS = [
  { id: "mtd" as const, label: "Month to Date" },
  { id: "last-month" as const, label: "Last Month" },
  { id: "ytd" as const, label: "Year to Date" },
  { id: "last-12" as const, label: "Last 12 Months" },
  { id: "last-cal-year" as const, label: "Last Calendar Year" },
] satisfies { id: NamedPreset; label: string }[];

type NamedPreset = "mtd" | "last-month" | "ytd" | "last-12" | "last-cal-year";

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayIso(): string {
  return fmtDate(new Date());
}

export function getPresetRange(preset: NamedPreset): { start: string; end: string } {
  const today = new Date();
  switch (preset) {
    case "mtd":
      return {
        start: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`,
        end: todayIso(),
      };
    case "last-month": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: fmtDate(first), end: fmtDate(last) };
    }
    case "ytd":
      return { start: `${today.getFullYear()}-01-01`, end: todayIso() };
    case "last-12": {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() - 1);
      d.setDate(d.getDate() + 1);
      return { start: fmtDate(d), end: todayIso() };
    }
    case "last-cal-year":
      return {
        start: `${today.getFullYear() - 1}-01-01`,
        end: `${today.getFullYear() - 1}-12-31`,
      };
  }
}

function fmtDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

export function presetDisplayLabel(
  preset: DatePreset,
  customStart?: string,
  customEnd?: string
): string {
  switch (preset) {
    case "all":          return "All dates";
    case "mtd":          return "Month to Date";
    case "last-month":   return "Last Month";
    case "ytd":          return "Year to Date";
    case "last-12":      return "Last 12 Months";
    case "last-cal-year":return "Last Calendar Year";
    case "custom":
      return customStart && customEnd
        ? `${fmtDisplay(customStart)} – ${fmtDisplay(customEnd)}`
        : "Custom";
  }
}
