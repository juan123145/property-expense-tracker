"use client";

import { useState } from "react";
import { FileArchive, Download, Loader2, FileText, Receipt } from "lucide-react";
import { DateRangePicker, type DateRangeValue } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPresetRange } from "@/lib/date-ranges";

type Property = { id: string; name: string };

type Props = {
  userProperties: Property[];
};

export function ReceiptBundleClient({ userProperties }: Props) {
  const defaultRange = getPresetRange("mtd");
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: "mtd",
    start: defaultRange.start,
    end: defaultRange.end,
  });
  const [propertyId, setPropertyId] = useState<string>("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(type: "summary" | "receipts" | "both") {
    const { start, end } = dateRange;
    if (!start || !end) {
      setError("Please select a date range.");
      return;
    }
    setLoading(type);
    setError(null);
    try {
      const params = new URLSearchParams({ start, end, type });
      if (propertyId !== "all") params.set("propertyId", propertyId);
      const res = await fetch(`/api/reports/receipt-bundle?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-bundle-${start}-${end}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const hasRange = !!dateRange.start && !!dateRange.end;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Receipt Bundle Export</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download a ZIP containing a transaction summary and all receipt attachments for a date range.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm">Filters</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Range</label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
          {userProperties.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Property</label>
              <Select value={propertyId} onValueChange={(v) => setPropertyId(v ?? "all")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {userProperties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Download options */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm">Generate & Download</h2>
        <p className="text-xs text-muted-foreground">
          Each option generates a ZIP file. &ldquo;Full Bundle&rdquo; includes both PDFs in one download.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <DownloadCard
            icon={FileText}
            title="Summary PDF"
            description="Transaction list with category totals"
            onClick={() => download("summary")}
            loading={loading === "summary"}
            disabled={!hasRange || loading !== null}
          />
          <DownloadCard
            icon={Receipt}
            title="Receipts PDF"
            description="All receipt attachments as pages"
            onClick={() => download("receipts")}
            loading={loading === "receipts"}
            disabled={!hasRange || loading !== null}
          />
          <DownloadCard
            icon={FileArchive}
            title="Full Bundle"
            description="Both PDFs in one ZIP"
            onClick={() => download("both")}
            loading={loading === "both"}
            disabled={!hasRange || loading !== null}
            primary
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <p className="text-xs text-muted-foreground border-t pt-3">
          Note: WebP receipt images (uploaded via mobile) will appear as reference pages in the Receipts PDF rather than embedded previews. All transactions are always included in the Summary PDF.
        </p>
      </div>
    </div>
  );
}

function DownloadCard({
  icon: Icon,
  title,
  description,
  onClick,
  loading,
  disabled,
  primary,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        primary
          ? "border-primary bg-primary/5 hover:bg-primary/10"
          : "hover:bg-muted"
      }`}
    >
      <div className={`flex items-center justify-center rounded-lg p-2 ${primary ? "bg-primary/10" : "bg-muted"}`}>
        {loading ? (
          <Loader2 className={`size-5 animate-spin ${primary ? "text-primary" : "text-muted-foreground"}`} />
        ) : (
          <Icon className={`size-5 ${primary ? "text-primary" : "text-muted-foreground"}`} />
        )}
      </div>
      <div>
        <p className={`text-sm font-semibold ${primary ? "text-primary" : ""}`}>{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className={`mt-auto flex items-center gap-1 text-xs font-medium ${primary ? "text-primary" : "text-muted-foreground"}`}>
        <Download className="size-3" />
        {loading ? "Generating…" : "Download"}
      </div>
    </button>
  );
}
