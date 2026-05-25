"use client";

import { useRouter } from "next/navigation";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExportButtons, type ExportColumn, type ExportSection } from "@/components/reports/export-buttons";
import { fmt, getYearOptions, type MonthlyBreakdownRow } from "@/lib/report-utils";
import { cn } from "@/lib/utils";

type Property = { id: string; name: string };
type Unit = { id: string; propertyId: string | null; name: string };

type Props = {
  data: MonthlyBreakdownRow[];
  year: number;
  userProperties: Property[];
  allUnits: Unit[];
  currentPropertyId: string;
  currentUnitId: string;
  propertyName: string;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthlyBreakdownClient({
  data, year, userProperties, allUnits,
  currentPropertyId, currentUnitId, propertyName,
}: Props) {
  const router = useRouter();
  const visibleUnits = allUnits.filter((u) => !currentPropertyId || u.propertyId === currentPropertyId);

  function buildUrl(patch: { property?: string; unit?: string; year?: number }) {
    const params = new URLSearchParams();
    const property = patch.property !== undefined ? patch.property : currentPropertyId;
    const unit = patch.unit !== undefined ? patch.unit : currentUnitId;
    const y = patch.year !== undefined ? patch.year : year;

    if (property) params.set("property", property);
    if (unit) params.set("unit", unit);
    if (y) params.set("year", String(y));
    const qs = params.toString();
    return `/reports/monthly-breakdown${qs ? `?${qs}` : ""}`;
  }

  // Column totals (per month)
  const colTotals = Array(12).fill(0) as number[];
  for (const row of data) {
    row.months.forEach((v, i) => { colTotals[i] += v; });
  }
  const grandTotal = colTotals.reduce((s, v) => s + v, 0);

  // Export
  const exportColumns: ExportColumn[] = [
    { header: "Category", key: "category" },
    ...MONTH_LABELS.map((m, i) => ({ header: m, key: `m${i}`, isCurrency: true })),
    { header: "Total", key: "rowTotal", isCurrency: true },
  ];
  const exportRows = data.map((row) => {
    const r: Record<string, string | number | null> = { category: row.category, rowTotal: row.rowTotal };
    row.months.forEach((v, i) => { r[`m${i}`] = v || null; });
    return r;
  });
  const totalsRow: Record<string, string | number | null> = { category: "Total", rowTotal: grandTotal };
  colTotals.forEach((v, i) => { totalsRow[`m${i}`] = v || null; });
  const exportSections: ExportSection[] = [{
    title: `Monthly Breakdown ${year}`,
    rows: exportRows,
    totalsRow,
  }];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Monthly Breakdown</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Expenses by category and month · {year}</p>
        </div>
        <ExportButtons
          reportName="Monthly Breakdown"
          propertyLabel={propertyName}
          periodLabel={String(year)}
          sections={exportSections}
          columns={exportColumns}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Year selector */}
        <Select
          value={String(year)}
          onValueChange={(v) => router.push(buildUrl({ year: parseInt(v ?? String(year)) }))}
        >
          <SelectTrigger className="!h-9 text-sm w-[110px] bg-background">
            <SelectValue>{year}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {getYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        {userProperties.length > 0 && (
          <Select
            value={currentPropertyId || "all"}
            onValueChange={(v) => router.push(buildUrl({ property: (v ?? "") === "all" ? "" : (v ?? ""), unit: "" }))}
          >
            <SelectTrigger className="!h-9 text-sm w-[180px] bg-background">
              <SelectValue placeholder="All Properties">
                {currentPropertyId ? (userProperties.find((p) => p.id === currentPropertyId)?.name ?? "") : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {userProperties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {visibleUnits.length > 0 && (
          <Select
            value={currentUnitId || "all"}
            onValueChange={(v) => router.push(buildUrl({ unit: (v ?? "") === "all" ? "" : (v ?? "") }))}
          >
            <SelectTrigger className="!h-9 text-sm w-[160px] bg-background">
              <SelectValue placeholder="All Units">
                {currentUnitId ? (allUnits.find((u) => u.id === currentUnitId)?.name ?? "") : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {visibleUnits.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-muted-foreground">No expenses recorded for {year}</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/40 min-w-[140px]">Category</th>
                {MONTH_LABELS.map((m) => (
                  <th key={m} className="text-right px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">{m}</th>
                ))}
                <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row) => (
                <tr key={row.category} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2 font-medium sticky left-0 bg-card">{row.category}</td>
                  {row.months.map((v, i) => (
                    <td key={i} className={cn("px-3 py-2 text-right tabular-nums", v === 0 ? "text-muted-foreground/40" : "")}>
                      {v === 0 ? "—" : `$${fmt(v)}`}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-semibold tabular-nums text-red-600">${fmt(row.rowTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td className="px-4 py-2.5 font-semibold sticky left-0 bg-muted/20">Total</td>
                {colTotals.map((v, i) => (
                  <td key={i} className={cn("px-3 py-2.5 text-right font-semibold tabular-nums", v === 0 ? "text-muted-foreground/40" : "text-red-600")}>
                    {v === 0 ? "—" : `$${fmt(v)}`}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-red-600">${fmt(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
