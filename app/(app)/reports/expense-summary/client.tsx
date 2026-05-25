"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DateRangePicker, type DateRangeValue } from "@/components/ui/date-range-picker";
import { ExportButtons, type ExportColumn, type ExportSection } from "@/components/reports/export-buttons";
import { fmt, CASH_FLOW_SECTIONS } from "@/lib/report-utils";
import { cn } from "@/lib/utils";
import type { Interval, ReportColumn, RawRow } from "./page";

// ─── Types ────────────────────────────────────────────────────────────────────

type Property = { id: string; name: string };
type Unit = { id: string; propertyId: string | null; name: string };

type Props = {
  rawRows: RawRow[];
  columns: ReportColumn[];
  interval: Interval;
  userProperties: Property[];
  allUnits: Unit[];
  currentPropertyId: string;
  currentUnitId: string;
  currentDateRange: DateRangeValue;
  periodLabel: string;
  propertyName: string;
};

type DisplayRow = {
  key: string;
  level: "section-header" | "category" | "subcategory" | "section-total" | "calculated";
  label: string;
  values: Record<string, number>;
  total: number;
  indent: number;
  bold: boolean;
  calcType?: "noi" | "ncf";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAccounting(n: number): string {
  if (n === 0) return "—";
  if (n < 0) return `(${fmt(Math.abs(n))})`;
  return fmt(n);
}

function buildRows(
  rawRows: RawRow[],
  colIds: string[],
  showSub: boolean
): DisplayRow[] {
  // Build lookup: type → category → subcategory → colKey → total
  type SubMap = Map<string | null, Map<string, number>>;
  type CatMap = Map<string, SubMap>;
  const lookup = new Map<string, CatMap>();

  for (const row of rawRows) {
    const t = row.type;
    const cat = row.category ?? "Uncategorized";
    const sub = row.subcategory;
    if (!lookup.has(t)) lookup.set(t, new Map());
    const catMap = lookup.get(t)!;
    if (!catMap.has(cat)) catMap.set(cat, new Map());
    const subMap = catMap.get(cat)!;
    if (!subMap.has(sub)) subMap.set(sub, new Map());
    const colMap = subMap.get(sub)!;
    colMap.set(row.colKey, (colMap.get(row.colKey) ?? 0) + row.total);
  }

  const rows: DisplayRow[] = [];
  const sectionTotals: Record<string, Record<string, number>> = {};

  for (const section of CASH_FLOW_SECTIONS) {
    const { id, label, categories, isIncome } = section;
    const typeKey = isIncome ? "income" : "expense";
    const catMap = lookup.get(typeKey);

    const sectionColTotals: Record<string, number> = {};
    colIds.forEach((c) => (sectionColTotals[c] = 0));
    let sectionTotal = 0;
    let sectionHasData = false;

    const categoryRows: DisplayRow[] = [];

    for (const cat of categories) {
      const subMap = catMap?.get(cat);
      if (!subMap) continue;

      // Compute category totals
      const catColTotals: Record<string, number> = {};
      colIds.forEach((c) => (catColTotals[c] = 0));
      let catTotal = 0;

      for (const [, colMap] of subMap.entries()) {
        for (const [colId, amt] of colMap.entries()) {
          catColTotals[colId] = (catColTotals[colId] ?? 0) + amt;
          catTotal += amt;
        }
      }

      colIds.forEach((c) => { sectionColTotals[c] += catColTotals[c] ?? 0; });
      sectionTotal += catTotal;
      sectionHasData = true;

      if (showSub) {
        // Subcategory rows sorted by name
        const sortedSubs = [...subMap.entries()]
          .filter(([sub]) => sub !== null)
          .sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""));

        for (const [sub, colMap] of sortedSubs) {
          const subColTotals: Record<string, number> = {};
          colIds.forEach((c) => (subColTotals[c] = 0));
          let subTotal = 0;
          for (const [colId, amt] of colMap.entries()) {
            subColTotals[colId] = amt;
            subTotal += amt;
          }
          if (subTotal === 0) continue;
          categoryRows.push({
            key: `${id}-${cat}-${sub}`,
            level: "subcategory",
            label: sub ?? "",
            values: subColTotals,
            total: subTotal,
            indent: 2,
            bold: false,
          });
        }
        if (catTotal > 0) {
          categoryRows.push({
            key: `${id}-${cat}-cattotal`,
            level: "category",
            label: `Total ${cat}`,
            values: catColTotals,
            total: catTotal,
            indent: 1,
            bold: true,
          });
        }
      } else {
        if (catTotal > 0) {
          categoryRows.push({
            key: `${id}-${cat}`,
            level: "category",
            label: cat,
            values: catColTotals,
            total: catTotal,
            indent: 1,
            bold: false,
          });
        }
      }
    }

    if (!sectionHasData) continue;

    // Section header
    rows.push({
      key: `section-${id}`,
      level: "section-header",
      label,
      values: {},
      total: 0,
      indent: 0,
      bold: true,
    });

    rows.push(...categoryRows);

    // Section total (always show)
    rows.push({
      key: `section-total-${id}`,
      level: "section-total",
      label: `Total ${label}`,
      values: sectionColTotals,
      total: sectionTotal,
      indent: 0,
      bold: true,
    });

    sectionTotals[id] = sectionColTotals;

    // Insert NOI after Operating Expenses
    if (id === "operating") {
      const incomeC = sectionTotals["income"] ?? {};
      const opC = sectionColTotals;
      const noiVals: Record<string, number> = {};
      colIds.forEach((c) => (noiVals[c] = (incomeC[c] ?? 0) - (opC[c] ?? 0)));
      const noiTotal = colIds.reduce((s, c) => s + noiVals[c], 0);
      rows.push({
        key: "noi",
        level: "calculated",
        label: "Net Operating Income",
        values: noiVals,
        total: noiTotal,
        indent: 0,
        bold: true,
        calcType: "noi",
      });
      sectionTotals["noi"] = noiVals;
    }
  }

  // Net Cash Flow at bottom
  const noiC = sectionTotals["noi"] ?? {};
  const mortC = sectionTotals["mortgage"] ?? {};
  const capC = sectionTotals["capital"] ?? {};
  const ncfVals: Record<string, number> = {};
  colIds.forEach((c) => (ncfVals[c] = (noiC[c] ?? 0) - (mortC[c] ?? 0) - (capC[c] ?? 0)));
  const ncfTotal = colIds.reduce((s, c) => s + ncfVals[c], 0);
  rows.push({
    key: "ncf",
    level: "calculated",
    label: "Net Cash Flow",
    values: ncfVals,
    total: ncfTotal,
    indent: 0,
    bold: true,
    calcType: "ncf",
  });

  return rows;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExpenseSummaryClient({
  rawRows, columns, interval, userProperties, allUnits,
  currentPropertyId, currentUnitId, currentDateRange, periodLabel, propertyName,
}: Props) {
  const router = useRouter();
  const [showSub, setShowSub] = useState(false);

  const colIds = columns.map((c) => c.id);
  const displayRows = useMemo(() => buildRows(rawRows, colIds, showSub), [rawRows, colIds, showSub]);

  const visibleUnits = allUnits.filter((u) => !currentPropertyId || u.propertyId === currentPropertyId);

  function buildUrl(patch: {
    property?: string; unit?: string; range?: DateRangeValue; interval?: Interval;
  }) {
    const params = new URLSearchParams();
    const property = patch.property !== undefined ? patch.property : currentPropertyId;
    const unit = patch.unit !== undefined ? patch.unit : currentUnitId;
    const range = patch.range !== undefined ? patch.range : currentDateRange;
    const iv = patch.interval !== undefined ? patch.interval : interval;

    if (property) params.set("property", property);
    if (unit) params.set("unit", unit);
    if (iv !== "by-month") params.set("interval", iv);
    if (range.preset !== "all") {
      params.set("preset", range.preset);
      if (range.start) params.set("start", range.start);
      if (range.end) params.set("end", range.end);
    }
    const qs = params.toString();
    return `/reports/expense-summary${qs ? `?${qs}` : ""}`;
  }

  // Build report header label
  const reportTitle = propertyName
    ? `Net Cash Flow for ${propertyName}`
    : "Net Cash Flow for All Properties";

  // Export
  const exportColumns: ExportColumn[] = [
    { header: "Line Item", key: "label" },
    ...columns.map((c) => ({ header: c.label, key: c.id, isCurrency: true })),
    { header: "Total", key: "total", isCurrency: true },
  ];
  const exportRows = displayRows
    .filter((r) => r.level !== "section-header" && r.total !== 0)
    .map((r) => {
      const row: Record<string, string | number | null> = { label: r.label, total: r.total };
      colIds.forEach((c) => { row[c] = r.values[c] ?? null; });
      return row;
    });
  const exportSections: ExportSection[] = [{ title: "Net Cash Flow", rows: exportRows }];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Net Cash Flow</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Income and expenses by category, including debt service and capital expenses.
          </p>
        </div>
        <ExportButtons
          reportName="Net Cash Flow"
          propertyLabel={propertyName}
          periodLabel={periodLabel}
          sections={exportSections}
          columns={exportColumns}
        />
      </div>

      {/* ── Filter bar (matching Stessa) ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Property */}
        {userProperties.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">Property</span>
            <Select
              value={currentPropertyId || "all"}
              onValueChange={(v) => router.push(buildUrl({ property: (v ?? "") === "all" ? "" : (v ?? ""), unit: "" }))}
            >
              <SelectTrigger className="!h-9 text-sm w-[180px] bg-background">
                <SelectValue>
                  {currentPropertyId
                    ? (userProperties.find((p) => p.id === currentPropertyId)?.name ?? "All Properties")
                    : "All Properties"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {userProperties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Range */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">Date Range</span>
          <DateRangePicker
            value={currentDateRange}
            onChange={(range) => router.push(buildUrl({ range }))}
            className="!h-9 text-sm"
          />
        </div>

        {/* Reporting Interval */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">Reporting Interval</span>
          <Select
            value={interval}
            onValueChange={(v) => router.push(buildUrl({ interval: (v ?? "by-month") as Interval }))}
          >
            <SelectTrigger className="!h-9 text-sm w-[150px] bg-background">
              <SelectValue>
                {interval === "by-month" ? "By Month" : "By Property"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="by-month">By Month</SelectItem>
              <SelectItem value="by-property">{currentPropertyId ? "By Unit" : "By Property"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category level */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">Category</span>
          <Select
            value={showSub ? "by-subcategory" : "by-category"}
            onValueChange={(v) => setShowSub((v ?? "by-category") === "by-subcategory")}
          >
            <SelectTrigger className="!h-9 text-sm w-[160px] bg-background">
              <SelectValue>
                {showSub ? "By Sub-Category" : "By Category"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="by-category">By Category</SelectItem>
              <SelectItem value="by-subcategory">By Sub-Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Report title ── */}
      <div className="pt-1">
        <p className="font-semibold text-base">{reportTitle}</p>
        <p className="text-sm text-muted-foreground">
          {interval === "by-month"
            ? `From ${columns[0]?.label ?? ""} through ${columns[columns.length - 1]?.label ?? ""}`
            : periodLabel}
        </p>
      </div>

      {/* ── Table ── */}
      {displayRows.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">No transactions recorded for this period</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: `${Math.max(600, columns.length * 110 + 220)}px` }}>
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/40 min-w-[200px]">
                  Line Item
                </th>
                {columns.map((col) => (
                  <th key={col.id} className="text-right px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[90px]">
                    {col.label}
                  </th>
                ))}
                <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide min-w-[90px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => {
                if (row.level === "section-header") {
                  return (
                    <tr key={row.key} className="bg-muted/20 border-t">
                      <td
                        colSpan={columns.length + 2}
                        className="px-4 py-2 font-semibold text-xs uppercase tracking-wide text-foreground sticky left-0 bg-muted/20"
                      >
                        {row.label}
                      </td>
                    </tr>
                  );
                }

                const isCalc = row.level === "calculated";
                const isTotal = row.level === "section-total";
                const isCatTotal = row.level === "category" && row.label.startsWith("Total ");
                const rowBg = isCalc ? "bg-muted/30 border-t-2 border-border" : "";

                return (
                  <tr
                    key={row.key}
                    className={cn(
                      "border-t transition-colors",
                      isCalc ? rowBg : "hover:bg-muted/20",
                      isTotal ? "bg-muted/10" : ""
                    )}
                  >
                    <td
                      className={cn(
                        "px-4 py-2 sticky left-0",
                        isCalc ? "bg-muted/30 font-bold" : isTotal ? "bg-muted/10 font-semibold" : "bg-card",
                        row.indent === 2 ? "pl-10 text-muted-foreground" : row.indent === 1 ? "pl-6" : "",
                        isCatTotal ? "pl-6 font-semibold" : ""
                      )}
                    >
                      {row.label}
                    </td>
                    {columns.map((col) => {
                      const v = row.values[col.id] ?? 0;
                      const isNeg = v < 0;
                      return (
                        <td
                          key={col.id}
                          className={cn(
                            "px-3 py-2 text-right tabular-nums",
                            v === 0 ? "text-muted-foreground/40" : "",
                            isNeg ? "text-red-600" : "",
                            row.bold ? "font-semibold" : ""
                          )}
                        >
                          {fmtAccounting(v)}
                        </td>
                      );
                    })}
                    {/* Total column */}
                    {(() => {
                      const t = row.total;
                      const isNeg = t < 0;
                      return (
                        <td
                          className={cn(
                            "px-4 py-2 text-right tabular-nums",
                            t === 0 ? "text-muted-foreground/40" : "",
                            isNeg ? "text-red-600" : "",
                            row.bold ? "font-bold" : "font-medium"
                          )}
                        >
                          {fmtAccounting(t)}
                        </td>
                      );
                    })()}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2.5 text-xs text-muted-foreground border-t">
            Report Created: {new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
          </div>
        </div>
      )}
    </div>
  );
}
