"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Building2 } from "lucide-react";
import { DateRangePicker, type DateRangeValue } from "@/components/ui/date-range-picker";
import { ExportButtons, type ExportColumn, type ExportSection } from "@/components/reports/export-buttons";
import { fmt, type ByPropertyRow } from "@/lib/report-utils";
import { cn } from "@/lib/utils";

type Props = {
  data: ByPropertyRow[];
  currentDateRange: DateRangeValue;
  periodLabel: string;
};

export function ByPropertyClient({ data, currentDateRange, periodLabel }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildUrl(range: DateRangeValue) {
    const params = new URLSearchParams();
    if (range.preset !== "all") {
      params.set("preset", range.preset);
      if (range.start) params.set("start", range.start);
      if (range.end) params.set("end", range.end);
    }
    const qs = params.toString();
    return `/reports/by-property${qs ? `?${qs}` : ""}`;
  }

  const totalIncome = data.reduce((s, r) => s + r.income, 0);
  const totalExpenses = data.reduce((s, r) => s + r.expenses, 0);
  const totalNet = totalIncome - totalExpenses;

  // Export
  const exportColumns: ExportColumn[] = [
    { header: "Property", key: "name" },
    { header: "Income", key: "income", isCurrency: true },
    { header: "Expenses", key: "expenses", isCurrency: true },
    { header: "Net Income", key: "net", isCurrency: true },
  ];
  const exportRows = data.map((r) => ({ name: r.name, income: r.income, expenses: r.expenses, net: r.net }));
  const exportSections: ExportSection[] = [{
    title: "By Property",
    rows: exportRows,
    totalsRow: { name: "Total", income: totalIncome, expenses: totalExpenses, net: totalNet },
  }];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">By Property</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{periodLabel}</p>
        </div>
        <ExportButtons
          reportName="By Property"
          propertyLabel=""
          periodLabel={periodLabel}
          sections={exportSections}
          columns={exportColumns}
        />
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <DateRangePicker
          value={currentDateRange}
          onChange={(range) => router.push(buildUrl(range))}
          className="!h-9 text-sm"
        />
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 flex flex-col items-center justify-center py-20 gap-3">
          <Building2 className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No properties found</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Property</th>
                <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Income</th>
                <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Expenses</th>
                <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Net</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((prop) => {
                const isExpanded = expanded.has(prop.id);
                const hasUnits = prop.units.length > 0;
                return (
                  <React.Fragment key={prop.id}>
                    <tr
                      className={cn("transition-colors", hasUnits ? "cursor-pointer hover:bg-muted/30" : "")}
                      onClick={hasUnits ? () => toggleExpand(prop.id) : undefined}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {hasUnits && (
                            <ChevronRight className={cn("size-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-90")} />
                          )}
                          {!hasUnits && <div className="w-4" />}
                          <div>
                            <p className="font-medium">{prop.name}</p>
                            {prop.address && <p className="text-xs text-muted-foreground">{prop.address}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-600 font-medium">${fmt(prop.income)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600 font-medium">${fmt(prop.expenses)}</td>
                      <td className={cn("px-4 py-3 text-right tabular-nums font-semibold",
                        prop.net >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {prop.net >= 0 ? "+" : "-"}${fmt(Math.abs(prop.net))}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {hasUnits && (
                          <ChevronRight className={cn("size-4 text-muted-foreground transition-transform md:hidden", isExpanded && "rotate-90")} />
                        )}
                      </td>
                    </tr>
                    {isExpanded && prop.units.map((unit) => (
                      <tr key={unit.id} className="bg-muted/20 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2 pl-12">
                          <p className="text-sm text-muted-foreground">{unit.name}</p>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-sm text-green-600">${fmt(unit.income)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-sm text-red-600">${fmt(unit.expenses)}</td>
                        <td className={cn("px-4 py-2 text-right tabular-nums text-sm font-medium",
                          unit.net >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {unit.net >= 0 ? "+" : "-"}${fmt(Math.abs(unit.net))}
                        </td>
                        <td />
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td className="px-4 py-2.5 font-semibold pl-10">Total</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-green-600">${fmt(totalIncome)}</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-red-600">${fmt(totalExpenses)}</td>
                <td className={cn("px-4 py-2.5 text-right font-bold tabular-nums",
                  totalNet >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {totalNet >= 0 ? "+" : "-"}${fmt(Math.abs(totalNet))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
