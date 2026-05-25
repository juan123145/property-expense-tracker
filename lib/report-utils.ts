import { CATEGORIES } from "@/lib/categories";

export function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

// Categories excluded from expense reports per JUA-50
export const EXCLUDED_CATEGORIES = ["Transfers"];

// Expense-only category groups (no Income or Transfers)
export const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (c) => c.name !== "Income" && c.name !== "Transfers"
);

// ─── Schedule E Groupings (JUA-54) ───────────────────────────────────────────

export type ScheduleESection = {
  label: string;
  /** category names included; if null → use subcategoryFilter */
  categories: string[] | null;
  /** when set, only this subcategory within the listed categories is included */
  subcategoryFilter?: string;
};

export const SCHEDULE_E_SECTIONS: ScheduleESection[] = [
  {
    label: "Income",
    categories: ["Income"],
  },
  {
    label: "Operating Expenses",
    categories: [
      "Admin & Other",
      "Legal & Professional",
      "Insurance",
      "Management Fees",
      "Repairs & Maintenance",
      "Utilities",
    ],
  },
  {
    label: "Capital Expenses",
    categories: ["Capital Expenses"],
  },
  {
    label: "Mortgage Interest",
    categories: ["Mortgages & Loans"],
    subcategoryFilter: "Mortgage Interest",
  },
  {
    label: "Property Taxes",
    categories: ["Taxes"],
    subcategoryFilter: "Property Taxes",
  },
];

// Year options for year-selector dropdowns (last 5 years + current)
export function getYearOptions(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => current - i);
}

// ─── Shared report data types ─────────────────────────────────────────────────

export type ExpenseSummaryRow = {
  category: string;
  total: number;
  pct: number;
};

export type MonthlyBreakdownRow = {
  category: string;
  months: number[]; // index 0=Jan ... 11=Dec
  rowTotal: number;
};

export type AnnualSummaryRow = {
  category: string;
  thisYear: number;
  lastYear: number;
  change: number;
  changePct: number | null; // null when lastYear is 0
};

export type ByPropertyRow = {
  id: string;
  name: string;
  address: string | null;
  income: number;
  expenses: number;
  net: number;
  units: ByUnitRow[];
};

export type ByUnitRow = {
  id: string;
  name: string;
  propertyId: string;
  income: number;
  expenses: number;
  net: number;
};

export type CpaSummaryLine = {
  category: string;
  subcategory: string | null;
  total: number;
};

export type CpaSummarySection = {
  label: string;
  lines: CpaSummaryLine[];
  sectionTotal: number;
};
