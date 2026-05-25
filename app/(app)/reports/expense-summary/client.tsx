"use client";

import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Tag } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DateRangePicker, type DateRangeValue } from "@/components/ui/date-range-picker";
import { ExportButtons, type ExportColumn, type ExportSection } from "@/components/reports/export-buttons";
import { fmt, fmtPct, type ExpenseSummaryRow } from "@/lib/report-utils";
import { getCategoryBadgeClass, CATEGORIES } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";

type Property = { id: string; name: string };
type Unit = { id: string; propertyId: string | null; name: string };

type Props = {
  data: ExpenseSummaryRow[];
  grandTotal: number;
  userProperties: Property[];
  allUnits: Unit[];
  currentPropertyId: string;
  currentUnitId: string;
  currentDateRange: DateRangeValue;
  periodLabel: string;
  propertyName: string;
};

function getCategoryColor(category: string): string {
  const cat = CATEGORIES.find((c) => c.name === category);
  if (!cat) return "#94a3b8";
  const cls = cat.badgeClass;
  if (cls.includes("green")) return "#16a34a";
  if (cls.includes("zinc")) return "#71717a";
  if (cls.includes("blue")) return "#2563eb";
  if (cls.includes("orange")) return "#ea580c";
  if (cls.includes("purple")) return "#9333ea";
  if (cls.includes("yellow")) return "#ca8a04";
  if (cls.includes("red")) return "#dc2626";
  if (cls.includes("cyan")) return "#0891b2";
  if (cls.includes("indigo")) return "#4f46e5";
  if (cls.includes("amber")) return "#d97706";
  if (cls.includes("pink")) return "#db2777";
  if (cls.includes("slate")) return "#64748b";
  return "#94a3b8";
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ExpenseSummaryRow }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{d.category}</p>
      <p className="text-muted-foreground">${fmt(d.total)} ({fmtPct(d.pct)})</p>
    </div>
  );
}

export function ExpenseSummaryClient({
  data, grandTotal, userProperties, allUnits,
  currentPropertyId, currentUnitId, currentDateRange, periodLabel, propertyName,
}: Props) {
  const router = useRouter();

  const visibleUnits = allUnits.filter((u) => !currentPropertyId || u.propertyId === currentPropertyId);

  function buildUrl(patch: { property?: string; unit?: string; range?: DateRangeValue }) {
    const params = new URLSearchParams();
    const property = patch.property !== undefined ? patch.property : currentPropertyId;
    const unit = patch.unit !== undefined ? patch.unit : currentUnitId;
    const range = patch.range !== undefined ? patch.range : currentDateRange;

    if (property) params.set("property", property);
    if (unit) params.set("unit", unit);
    if (range.preset !== "all") {
      params.set("preset", range.preset);
      if (range.start) params.set("start", range.start);
      if (range.end) params.set("end", range.end);
    }
    const qs = params.toString();
    return `/reports/expense-summary${qs ? `?${qs}` : ""}`;
  }

  // Export data
  const exportColumns: ExportColumn[] = [
    { header: "Category", key: "category" },
    { header: "Total", key: "total", isCurrency: true },
    { header: "% of Total", key: "pct" },
  ];
  const exportRows = data.map((r) => ({ category: r.category, total: r.total, pct: fmtPct(r.pct) }));
  const exportSections: ExportSection[] = [{
    title: "Expense Summary",
    rows: exportRows,
    totalsRow: { category: "Total", total: grandTotal, pct: "100.0%" },
  }];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Expense Summary</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{periodLabel}</p>
        </div>
        <ExportButtons
          reportName="Expense Summary"
          propertyLabel={propertyName}
          periodLabel={periodLabel}
          sections={exportSections}
          columns={exportColumns}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
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
        <DateRangePicker
          value={currentDateRange}
          onChange={(range) => router.push(buildUrl({ range }))}
          className="!h-9 text-sm"
        />
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 flex flex-col items-center justify-center py-20 gap-3">
          <Tag className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No expenses recorded for this period</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Bar chart */}
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">By Category</h2>
            <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barSize={16}>
                <XAxis
                  type="number"
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={130}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Category</th>
                  <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Total</th>
                  <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((row) => (
                  <tr key={row.category} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={`text-xs ${getCategoryBadgeClass(row.category)}`}>
                        {row.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-red-600">
                      ${fmt(row.total)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {fmtPct(row.pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td className="px-4 py-2.5 font-semibold">Total</td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-red-600">${fmt(grandTotal)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
