"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExportButtons, type ExportColumn, type ExportSection } from "@/components/reports/export-buttons";
import { fmt, getYearOptions, type CpaSummarySection } from "@/lib/report-utils";
import { cn } from "@/lib/utils";

type Property = { id: string; name: string };

type Props = {
  sections: CpaSummarySection[];
  year: number;
  userProperties: Property[];
  currentPropertyId: string;
  propertyName: string;
};

export function CpaSummaryClient({
  sections, year, userProperties, currentPropertyId, propertyName,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(sections.map((s) => s.label)));

  function toggleSection(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function buildUrl(patch: { property?: string; year?: number }) {
    const params = new URLSearchParams();
    const property = patch.property !== undefined ? patch.property : currentPropertyId;
    const y = patch.year !== undefined ? patch.year : year;
    if (property) params.set("property", property);
    if (y) params.set("year", String(y));
    const qs = params.toString();
    return `/reports/cpa-summary${qs ? `?${qs}` : ""}`;
  }

  // Export — one section per sheet
  const exportColumns: ExportColumn[] = [
    { header: "Category", key: "category" },
    { header: "Subcategory", key: "subcategory" },
    { header: "Total", key: "total", isCurrency: true },
  ];
  const exportSections: ExportSection[] = sections
    .filter((s) => s.lines.length > 0)
    .map((s) => ({
      title: s.label,
      rows: s.lines.map((l) => ({
        category: l.category,
        subcategory: l.subcategory ?? "—",
        total: l.total,
      })),
      totalsRow: { category: "Section Total", subcategory: "", total: s.sectionTotal },
    }));

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">CPA / Tax Summary</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Schedule E reference · {year}</p>
        </div>
        <ExportButtons
          reportName="CPA Tax Summary"
          propertyLabel={propertyName}
          periodLabel={String(year)}
          sections={exportSections.length ? exportSections : [{ title: "CPA Tax Summary", rows: [] }]}
          columns={exportColumns}
        />
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="size-4 mt-0.5 shrink-0 text-amber-500" />
        <p><strong>For CPA Reference Only</strong> — This report is not a tax filing. Consult a licensed tax professional for tax advice.</p>
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
            onValueChange={(v) => router.push(buildUrl({ property: (v ?? "") === "all" ? "" : (v ?? "") }))}
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
      </div>

      {/* Schedule E Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isExpanded = expanded.has(section.label);
          const isEmpty = section.lines.length === 0;

          return (
            <div key={section.label} className="rounded-xl border bg-card overflow-hidden">
              {/* Section header */}
              <button
                type="button"
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                  <span className="font-semibold text-sm">{section.label}</span>
                  {isEmpty && <span className="text-xs text-muted-foreground">(no data)</span>}
                </div>
                <span className={cn("font-bold tabular-nums text-sm", isEmpty ? "text-muted-foreground" : "text-foreground")}>
                  {isEmpty ? "—" : `$${fmt(section.sectionTotal)}`}
                </span>
              </button>

              {/* Section rows */}
              {isExpanded && !isEmpty && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/10">
                      <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground uppercase tracking-wide">Category</th>
                      <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground uppercase tracking-wide">Subcategory</th>
                      <th className="text-right px-4 py-2 font-medium text-xs text-muted-foreground uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {section.lines.map((line, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2 text-muted-foreground">{line.category}</td>
                        <td className="px-4 py-2 font-medium">{line.subcategory ?? <span className="text-muted-foreground italic text-xs">All</span>}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium">${fmt(line.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20">
                      <td className="px-4 py-2 font-semibold" colSpan={2}>Section Total</td>
                      <td className="px-4 py-2 text-right font-bold tabular-nums">${fmt(section.sectionTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
