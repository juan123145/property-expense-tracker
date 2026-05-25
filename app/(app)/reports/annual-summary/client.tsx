"use client";

import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExportButtons, type ExportColumn, type ExportSection } from "@/components/reports/export-buttons";
import { fmt, fmtPct, getYearOptions, type AnnualSummaryRow } from "@/lib/report-utils";
import { cn } from "@/lib/utils";

type Property = { id: string; name: string };
type Unit = { id: string; propertyId: string | null; name: string };

type Props = {
  data: AnnualSummaryRow[];
  year: number;
  hasPriorYearData: boolean;
  userProperties: Property[];
  allUnits: Unit[];
  currentPropertyId: string;
  currentUnitId: string;
  propertyName: string;
};

export function AnnualSummaryClient({
  data, year, hasPriorYearData, userProperties, allUnits,
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
    return `/reports/annual-summary${qs ? `?${qs}` : ""}`;
  }

  const thisYearTotal = data.reduce((s, r) => s + r.thisYear, 0);
  const lastYearTotal = data.reduce((s, r) => s + r.lastYear, 0);
  const totalChange = thisYearTotal - lastYearTotal;
  const totalChangePct = lastYearTotal > 0 ? (totalChange / lastYearTotal) * 100 : null;

  // Export
  const exportColumns: ExportColumn[] = hasPriorYearData
    ? [
        { header: "Category", key: "category" },
        { header: `${year}`, key: "thisYear", isCurrency: true },
        { header: `${year - 1}`, key: "lastYear", isCurrency: true },
        { header: "Change ($)", key: "change", isCurrency: true },
        { header: "Change (%)", key: "changePct" },
      ]
    : [
        { header: "Category", key: "category" },
        { header: `${year}`, key: "thisYear", isCurrency: true },
      ];

  const exportRows = data.map((r) => ({
    category: r.category,
    thisYear: r.thisYear,
    lastYear: r.lastYear,
    change: r.change,
    changePct: r.changePct != null ? fmtPct(r.changePct) : "—",
  }));
  const exportSections: ExportSection[] = [{
    title: `Annual Summary ${year}`,
    rows: exportRows,
    totalsRow: {
      category: "Total",
      thisYear: thisYearTotal,
      lastYear: lastYearTotal,
      change: totalChange,
      changePct: totalChangePct != null ? fmtPct(totalChangePct) : "—",
    },
  }];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Annual Summary</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Year-over-year comparison · {year}</p>
        </div>
        <ExportButtons
          reportName="Annual Summary"
          propertyLabel={propertyName}
          periodLabel={String(year)}
          sections={exportSections}
          columns={exportColumns}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
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
              <SelectValue>
                {currentPropertyId ? (userProperties.find((p) => p.id === currentPropertyId)?.name ?? "All Properties") : "All Properties"}
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
              <SelectValue>
                {currentUnitId ? (allUnits.find((u) => u.id === currentUnitId)?.name ?? "All Units") : "All Units"}
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
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">{year}</th>
                {hasPriorYearData && (
                  <>
                    <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">{year - 1}</th>
                    <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Change ($)</th>
                    <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Change (%)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row) => {
                const isHigher = row.change > 0;
                const isLower = row.change < 0;
                return (
                  <tr key={row.category} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{row.category}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-red-600">${fmt(row.thisYear)}</td>
                    {hasPriorYearData && (
                      <>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {row.lastYear > 0 ? `$${fmt(row.lastYear)}` : "—"}
                        </td>
                        <td className={cn("px-4 py-2.5 text-right tabular-nums font-medium flex items-center justify-end gap-1",
                          isHigher ? "text-red-600" : isLower ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {isHigher && <TrendingUp className="size-3.5" />}
                          {isLower && <TrendingDown className="size-3.5" />}
                          {row.change !== 0 ? `${isHigher ? "+" : ""}$${fmt(Math.abs(row.change))}` : "—"}
                        </td>
                        <td className={cn("px-4 py-2.5 text-right tabular-nums",
                          isHigher ? "text-red-600" : isLower ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {row.changePct != null ? `${isHigher ? "+" : ""}${fmtPct(row.changePct)}` : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td className="px-4 py-2.5 font-semibold">Total</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-red-600">${fmt(thisYearTotal)}</td>
                {hasPriorYearData && (
                  <>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-muted-foreground">
                      {lastYearTotal > 0 ? `$${fmt(lastYearTotal)}` : "—"}
                    </td>
                    <td className={cn("px-4 py-2.5 text-right font-bold tabular-nums",
                      totalChange > 0 ? "text-red-600" : totalChange < 0 ? "text-green-600" : "text-muted-foreground"
                    )}>
                      {totalChange !== 0 ? `${totalChange > 0 ? "+" : ""}$${fmt(Math.abs(totalChange))}` : "—"}
                    </td>
                    <td className={cn("px-4 py-2.5 text-right font-semibold tabular-nums",
                      totalChange > 0 ? "text-red-600" : totalChange < 0 ? "text-green-600" : "text-muted-foreground"
                    )}>
                      {totalChangePct != null ? `${totalChange > 0 ? "+" : ""}${fmtPct(totalChangePct)}` : "—"}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
