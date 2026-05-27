"use client";

import { useMemo, useState, useEffect, useTransition, useRef, useCallback } from "react";
import {
  Plus, Paperclip, CheckCircle2, AlertTriangle, MoreHorizontal,
  Pencil, Trash2, Receipt, Search, X, SlidersHorizontal,
  RotateCcw, AlertCircle, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker, type DateRangeValue, DATE_RANGE_ALL } from "@/components/ui/date-range-picker";
import { AddTransactionSheet, type TransactionFormData } from "@/components/transactions/add-transaction-sheet";
import { DeleteTransactionDialog, useDeleteDialog } from "@/components/transactions/delete-transaction-button";
import { AttachmentViewer } from "@/components/transactions/attachment-viewer";
import { getCategoryBadgeClass, CATEGORIES } from "@/lib/categories";
import { markAsReviewed, restoreTransaction } from "@/app/actions/transactions";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 2;
const PAGE_SIZE_OPTIONS = [2, 10, 30];

export type TransactionRow = {
  id: string;
  date: string;
  amount: string;
  type: string;
  payee: string | null;
  category: string | null;
  subcategory: string | null;
  propertyId: string | null;
  unitId: string | null;
  notes: string | null;
  needsReview: boolean | null;
  propertyName: string | null;
  propertyImage: string | null;
  unitName: string | null;
  attachments: Array<{ id: string; url: string; name: string | null; sizeKb: number | null }>;
};

type TrashedRow = {
  id: string;
  date: string;
  amount: string;
  type: string;
  payee: string | null;
  category: string | null;
  subcategory: string | null;
  deletedAt: Date | null;
  propertyName: string | null;
  propertyImage: string | null;
  unitName: string | null;
};

type Property = { id: string; name: string };
type Unit = { id: string; propertyId: string | null; name: string };

type Props = {
  transactions: TransactionRow[];
  trashedTransactions: TrashedRow[];
  properties: Property[];
  allUnits: Unit[];
  userId: string;
};

type Tab = "all" | "needs-review" | "trash";

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

function formatAmount(amount: string, type: string) {
  const n = parseFloat(amount);
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return type === "income" ? `+$${formatted}` : `-$${formatted}`;
}

function daysUntilDeletion(deletedAt: Date | null): number {
  if (!deletedAt) return 30;
  const ms = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

// ─── Missing-field chips (used in Needs Review) ───────────────────────────────

function MissingChip({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
      <Icon className="size-2.5 shrink-0" />
      {label}
    </span>
  );
}

function MissingAmberChip({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
      <Icon className="size-2.5 shrink-0" />
      {label}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function TransactionsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

// ─── Mobile transaction card ─────────────────────────────────────────────────

function TransactionCard({
  tx,
  onEdit,
  onDelete,
  onViewAttachments,
}: {
  tx: TransactionRow;
  onEdit: (tx: TransactionRow) => void;
  onDelete: (id: string) => void;
  onViewAttachments: (tx: TransactionRow) => void;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 active:bg-accent transition-colors cursor-pointer"
      onClick={() => onEdit(tx)}
    >
      {tx.propertyImage && (
        <div className="size-12 shrink-0 rounded-md overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tx.propertyImage} alt={tx.propertyName || "Property"} className="size-full object-cover" />
        </div>
      )}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <div className={`size-2 rounded-full ${tx.needsReview ? "bg-yellow-400" : "bg-green-500"}`} />
        <span className="text-[10px] text-muted-foreground tabular-nums leading-none">
          {formatDate(tx.date)}
        </span>
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium truncate">
          {tx.payee ?? <span className="text-muted-foreground italic">No payee</span>}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {tx.category ? (
            <Badge className={`text-[10px] px-1.5 py-0 ${getCategoryBadgeClass(tx.category)}`}>
              {tx.category}
            </Badge>
          ) : (
            <MissingChip label="No category" icon={AlertCircle} />
          )}
          {tx.subcategory && (
            <span className="text-[10px] text-muted-foreground">{tx.subcategory}</span>
          )}
        </div>
        {tx.propertyName ? (
          <p className="text-[10px] text-muted-foreground truncate">
            {tx.propertyName}{tx.unitName ? ` · ${tx.unitName}` : ""}
          </p>
        ) : (
          <div className="pt-0.5">
            <MissingAmberChip label="No property" icon={MapPin} />
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className={`text-sm font-semibold tabular-nums ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
          {formatAmount(tx.amount, tx.type)}
        </span>
        <div className="flex items-center gap-2">
          {tx.attachments.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewAttachments(tx); }}
              className="text-primary hover:opacity-70"
              aria-label="View receipts"
            >
              <Paperclip className="size-3.5" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent"
              aria-label="Row actions"
            >
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(tx)}>
                <Pencil className="size-3.5 mr-2" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(tx.id)}>
                <Trash2 className="size-3.5 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ─── Filter state ─────────────────────────────────────────────────────────────

type FilterState = {
  search: string;
  typeFilter: "all" | "income" | "expense";
  categoryFilter: string;
  propertyFilter: string;
  dateRange: DateRangeValue;
};

const DEFAULT_FILTERS: FilterState = {
  search: "",
  typeFilter: "all",
  categoryFilter: "",
  propertyFilter: "",
  dateRange: DATE_RANGE_ALL,
};

// ─── Needs Review tab content ─────────────────────────────────────────────────

function MarkReviewedButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"
      disabled={pending}
      onClick={() => startTransition(async () => {
        try { await markAsReviewed(id); toast.success("Marked as reviewed."); }
        catch { toast.error("Something went wrong."); }
      })}
    >
      <CheckCircle2 className="size-3" />
      {pending ? "Saving…" : "Mark reviewed"}
    </Button>
  );
}

function NeedsReviewTab({
  transactions,
  properties,
  allUnits,
  onEdit,
}: {
  transactions: TransactionRow[];
  properties: Property[];
  allUnits: Unit[];
  onEdit: (tx: TransactionRow) => void;
}) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 className="size-12 text-muted-foreground mb-4" />
        <p className="font-medium">Nothing to review — you&apos;re all caught up</p>
        <p className="text-sm text-muted-foreground mt-1">
          Transactions flagged for missing category, property, or receipt will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 cursor-pointer active:bg-accent"
            onClick={() => onEdit(tx)}
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{tx.payee ?? <span className="text-muted-foreground italic">No payee</span>}</p>
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                  {formatAmount(tx.amount, tx.type)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{formatDate(tx.date)}</p>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {!tx.category && <MissingChip label="No category" icon={AlertCircle} />}
                {!tx.propertyName && <MissingAmberChip label="No property" icon={MapPin} />}
                {tx.attachments.length === 0 && <MissingAmberChip label="No receipt" icon={Paperclip} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Date</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[1px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onEdit(tx)}>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</TableCell>
                <TableCell className="font-medium max-w-[160px] truncate">
                  {tx.payee ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {tx.category ? (
                    <div className="flex flex-col gap-0.5">
                      <Badge className={`text-xs w-fit ${getCategoryBadgeClass(tx.category)}`}>{tx.category}</Badge>
                      {tx.subcategory && <span className="text-xs text-muted-foreground">{tx.subcategory}</span>}
                    </div>
                  ) : (
                    <MissingChip label="No category" icon={AlertCircle} />
                  )}
                </TableCell>
                <TableCell>
                  {tx.propertyName ? (
                    <span className="text-sm">{tx.propertyName}{tx.unitName && ` · ${tx.unitName}`}</span>
                  ) : (
                    <MissingAmberChip label="No property" icon={MapPin} />
                  )}
                </TableCell>
                <TableCell>
                  {tx.attachments.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Paperclip className="size-3" />{tx.attachments.length}
                    </span>
                  ) : (
                    <MissingAmberChip label="No receipt" icon={Paperclip} />
                  )}
                </TableCell>
                <TableCell className={`text-right text-sm font-medium whitespace-nowrap ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatAmount(tx.amount, tx.type)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onEdit(tx); }}>
                      <Pencil className="size-3" />
                    </Button>
                    <MarkReviewedButton id={tx.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ─── Trash tab content ────────────────────────────────────────────────────────

function RestoreButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"
      disabled={pending}
      onClick={() => startTransition(async () => {
        try { await restoreTransaction(id); toast.success("Transaction restored."); }
        catch { toast.error("Something went wrong."); }
      })}
    >
      <RotateCcw className="size-3" />
      {pending ? "Restoring…" : "Restore"}
    </Button>
  );
}

function TrashTab({ transactions }: { transactions: TrashedRow[] }) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Trash2 className="size-12 text-muted-foreground mb-4" />
        <p className="font-medium">Trash is empty</p>
        <p className="text-sm text-muted-foreground mt-1">
          Deleted transactions appear here for 30 days before being permanently removed.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Date</TableHead>
            <TableHead>Payee</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Property</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Deleted On</TableHead>
            <TableHead>Days Left</TableHead>
            <TableHead className="w-[1px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const days = daysUntilDeletion(tx.deletedAt);
            return (
              <TableRow key={tx.id}>
                <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{formatDate(tx.date)}</TableCell>
                <TableCell className="text-sm font-medium">
                  {tx.payee ?? <span className="text-muted-foreground italic">No payee</span>}
                </TableCell>
                <TableCell>
                  {tx.category ? (
                    <Badge variant="outline" className={getCategoryBadgeClass(tx.category)}>
                      {tx.subcategory ?? tx.category}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {tx.propertyName ?? "—"}{tx.unitName && ` · ${tx.unitName}`}
                </TableCell>
                <TableCell className={`text-right text-sm font-medium whitespace-nowrap ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatAmount(tx.amount, tx.type)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {tx.deletedAt
                    ? new Date(tx.deletedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </TableCell>
                <TableCell>
                  <span className={`text-sm font-medium ${days <= 3 ? "text-destructive" : days <= 7 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {days}d
                  </span>
                </TableCell>
                <TableCell>
                  <RestoreButton id={tx.id} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── All Transactions tab section ─────────────────────────────────────────────

type TableSectionProps = {
  transactions: TransactionRow[];
  properties: Property[];
  allUnits: Unit[];
  onOpenAdd: () => void;
  onEdit: (tx: TransactionRow) => void;
};

function AllTransactionsTab({ transactions, properties, allUnits, onOpenAdd, onEdit }: TableSectionProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageData, setPageData] = useState<TransactionRow[]>(transactions);
  const [pagination, setPagination] = useState({ total: transactions.length, totalPages: 1, pageSize: DEFAULT_PAGE_SIZE });
  const [isLoading, setIsLoading] = useState(false);

  const { deleteId, openDelete, closeDelete } = useDeleteDialog();
  const [viewerTx, setViewerTx] = useState<TransactionRow | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const abortControllerRef = useRef<AbortController | null>(null);

  function patchFilters(patch: Partial<FilterState>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  }
  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  }
  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(0);
  }

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.typeFilter !== "all" ||
    filters.categoryFilter !== "" ||
    filters.propertyFilter !== "" ||
    filters.dateRange.preset !== "all";

  const fetchPage = useCallback(async (pageNum: number) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: String(pageSize),
        ...(filters.search && { search: filters.search }),
        ...(filters.typeFilter !== "all" && { type: filters.typeFilter }),
        ...(filters.categoryFilter && { category: filters.categoryFilter }),
        ...(filters.propertyFilter && { property: filters.propertyFilter }),
        ...(filters.dateRange.preset !== "all" && {
          startDate: filters.dateRange.start,
          endDate: filters.dateRange.end,
        }),
      });

      const res = await fetch(`/api/transactions/paginated?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();

      // Ignore stale responses
      if (controller.signal.aborted) return;

      setPageData(json.data);
      setPagination(json.pagination);
      setPage(json.pagination.page);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Failed to load page:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pageSize]);

  // Fetch whenever page or filters change
  useEffect(() => {
    fetchPage(page);
  }, [page, filters, fetchPage]);

  return (
    <div suppressHydrationWarning>
      {/* Filter bar — Stessa-style: always visible, 2 rows */}
      {transactions.length > 0 && (
        <div className="mb-4 space-y-2">
          {/* Row 1: search + property */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search for..."
                className="pl-8 !h-9 text-sm"
                value={filters.search}
                onChange={(e) => patchFilters({ search: e.target.value })}
              />
            </div>
            {properties.length > 0 && (
              <Select value={filters.propertyFilter || "all"} onValueChange={(v) => patchFilters({ propertyFilter: (v ?? "") === "all" ? "" : (v ?? "") })}>
                <SelectTrigger className="!h-9 text-sm w-[180px] bg-background">
                  <SelectValue>
                    {filters.propertyFilter
                      ? (properties.find((p) => p.id === filters.propertyFilter)?.name ?? "All Properties")
                      : "All Properties"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Row 2: date + category + type + pageSize + clear */}
          <div className="flex flex-wrap gap-2 items-center">
            <DateRangePicker
              value={filters.dateRange}
              onChange={(range) => patchFilters({ dateRange: range })}
              className="!h-9 text-sm"
            />
            <Select value={filters.categoryFilter || "all"} onValueChange={(v) => patchFilters({ categoryFilter: (v ?? "") === "all" ? "" : (v ?? "") })}>
              <SelectTrigger className="!h-9 text-sm w-[160px] bg-background">
                <SelectValue>
                  {filters.categoryFilter || "All Categories"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.typeFilter} onValueChange={(v) => patchFilters({ typeFilter: (v ?? "all") as FilterState["typeFilter"] })}>
              <SelectTrigger className="!h-9 text-sm w-[140px] bg-background">
                <SelectValue>
                  {filters.typeFilter === "income" ? "Money in" : filters.typeFilter === "expense" ? "Money out" : "All amounts"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All amounts</SelectItem>
                <SelectItem value="income">Money in</SelectItem>
                <SelectItem value="expense">Money out</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => handlePageSizeChange(parseInt(v ?? String(DEFAULT_PAGE_SIZE)))}>
              <SelectTrigger className="!h-9 text-sm w-[120px] bg-background">
                <SelectValue>{pageSize} per page</SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="!h-9 px-3 text-sm text-muted-foreground" onClick={clearFilters}>
                <X className="size-3.5 mr-1" />Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Empty / filtered-empty states */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border rounded-lg bg-muted/30">
          <Receipt className="size-12 text-muted-foreground" />
          <div>
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first transaction to start tracking.</p>
          </div>
          <Button onClick={onOpenAdd}><Plus className="size-4 mr-2" />Add Transaction</Button>
        </div>
      ) : pageData.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border rounded-lg bg-muted/30">
          <SlidersHorizontal className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No transactions match your filters</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting or clearing your filters.</p>
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters}><X className="size-3.5 mr-1.5" />Clear Filters</Button>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden space-y-2">
            {isLoading ? (
              <TransactionsSkeleton />
            ) : (
              pageData.map((tx) => (
                <TransactionCard key={tx.id} tx={tx} onEdit={onEdit} onDelete={openDelete} onViewAttachments={setViewerTx} />
              ))
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Date</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center w-10"></TableHead>
                  <TableHead className="text-center w-10"></TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-20 text-center">
                      <div className="flex justify-center items-center">Loading...</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageData.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className={cn(
                      "cursor-pointer",
                      tx.needsReview ? "border-l-2 border-l-amber-400 bg-amber-50/30 hover:bg-amber-50/50 dark:bg-amber-950/10 dark:hover:bg-amber-950/20" : "hover:bg-muted/30"
                    )}
                    onClick={() => onEdit(tx)}
                  >
                    <TableCell className="text-muted-foreground text-xs">{formatDate(tx.date)}</TableCell>
                    <TableCell className="font-medium max-w-[140px] truncate">
                      {tx.payee ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {tx.category ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge className={`text-xs w-fit ${getCategoryBadgeClass(tx.category)}`}>{tx.category}</Badge>
                          {tx.subcategory && <span className="text-xs text-muted-foreground">{tx.subcategory}</span>}
                        </div>
                      ) : (
                        <MissingChip label="No category" icon={AlertCircle} />
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[120px] truncate">
                      {tx.propertyName ?? <MissingAmberChip label="No property" icon={MapPin} />}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.unitName ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      <span className={tx.type === "income" ? "text-green-600" : "text-red-600"}>
                        {formatAmount(tx.amount, tx.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => { if (tx.attachments.length > 0) { e.stopPropagation(); setViewerTx(tx); } }}>
                      {tx.attachments.length > 0 ? (
                        <Paperclip className="size-3.5 text-primary mx-auto cursor-pointer hover:opacity-70" />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-center">
                      {tx.needsReview
                        ? <AlertTriangle className="size-3.5 text-amber-500 mx-auto" />
                        : <CheckCircle2 className="size-3.5 text-green-500 mx-auto" />}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent" aria-label="Row actions">
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(tx)}><Pencil className="size-3.5 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => openDelete(tx.id)}><Trash2 className="size-3.5 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
            <span>
              {hasActiveFilters
                ? `${pagination.total} of ${transactions.length} transactions`
                : `${pagination.total} transaction${pagination.total !== 1 ? "s" : ""}`}
              {pagination.totalPages > 1 && ` · page ${page + 1} of ${pagination.totalPages}`}
            </span>
            {pagination.totalPages > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0 || isLoading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages - 1 || isLoading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {deleteId && (
        <DeleteTransactionDialog id={deleteId} open={!!deleteId} onOpenChange={(o) => { if (!o) closeDelete(); }} />
      )}

      {viewerTx && viewerTx.attachments.length > 0 && (
        <AttachmentViewer
          open={!!viewerTx}
          onOpenChange={(o) => { if (!o) setViewerTx(null); }}
          transactionId={viewerTx.id}
          attachments={viewerTx.attachments}
          onDeleted={() => setViewerTx(null)}
        />
      )}
    </div>
  );
}

// ─── TransactionsTableSection — self-contained embed (used by property detail) ─

export function TransactionsTableSection({
  transactions,
  properties,
  allUnits,
  showAddButton = true,
}: {
  transactions: TransactionRow[];
  properties: Property[];
  allUnits: Unit[];
  showAddButton?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<TransactionFormData | undefined>();

  function handleOpenAdd() { setEditTransaction(undefined); setSheetOpen(true); }
  function handleEdit(tx: TransactionRow) {
    setEditTransaction({
      id: tx.id, date: tx.date, amount: tx.amount, type: tx.type,
      payee: tx.payee, category: tx.category, subcategory: tx.subcategory,
      propertyId: tx.propertyId, unitId: tx.unitId, notes: tx.notes,
      attachments: tx.attachments,
    });
    setSheetOpen(true);
  }

  return (
    <>
      {showAddButton && transactions.length === 0 ? null : !showAddButton && transactions.length > 0 ? (
        <div className="flex justify-end mb-2">
          <Button size="sm" onClick={handleOpenAdd}><Plus className="size-4 mr-1" />Add Transaction</Button>
        </div>
      ) : null}

      <AllTransactionsTab
        transactions={transactions}
        properties={properties}
        allUnits={allUnits}
        onOpenAdd={handleOpenAdd}
        onEdit={handleEdit}
      />

      <AddTransactionSheet
        key={editTransaction ? editTransaction.id : "new"}
        open={sheetOpen}
        onOpenChange={(o) => { setSheetOpen(o); if (!o) setEditTransaction(undefined); }}
        transaction={editTransaction}
        properties={properties}
        allUnits={allUnits}
      />
    </>
  );
}

// ─── Root client component ────────────────────────────────────────────────────

export function TransactionsClient({ transactions, trashedTransactions, properties, allUnits, userId }: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<TransactionFormData | undefined>();

  const needsReviewTxs = transactions.filter((tx) => tx.needsReview);
  const needsReviewCount = needsReviewTxs.length;

  function handleOpenAdd() { setEditTransaction(undefined); setSheetOpen(true); }
  function handleEdit(tx: TransactionRow) {
    setEditTransaction({
      id: tx.id, date: tx.date, amount: tx.amount, type: tx.type,
      payee: tx.payee, category: tx.category, subcategory: tx.subcategory,
      propertyId: tx.propertyId, unitId: tx.unitId, notes: tx.notes,
      attachments: tx.attachments,
    });
    setSheetOpen(true);
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button onClick={handleOpenAdd} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Tab nav — Tessa-style underline tabs */}
      <div className="flex gap-0 border-b">
        {(
          [
            { id: "all" as Tab, label: "All Transactions", count: undefined as number | undefined },
            { id: "needs-review" as Tab, label: "Needs Review", count: needsReviewCount as number | undefined },
            { id: "trash" as Tab, label: "Trash", count: undefined as number | undefined },
          ]
        ).map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap",
              tab === id
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "all" && (
        <AllTransactionsTab
          transactions={transactions}
          properties={properties}
          allUnits={allUnits}
          onOpenAdd={handleOpenAdd}
          onEdit={handleEdit}
        />
      )}
      {tab === "needs-review" && (
        <NeedsReviewTab
          transactions={needsReviewTxs}
          properties={properties}
          allUnits={allUnits}
          onEdit={handleEdit}
        />
      )}
      {tab === "trash" && (
        <TrashTab transactions={trashedTransactions} />
      )}

      {/* Shared sheet for add/edit */}
      <AddTransactionSheet
        key={editTransaction ? editTransaction.id : "new"}
        open={sheetOpen}
        onOpenChange={(o) => { setSheetOpen(o); if (!o) setEditTransaction(undefined); }}
        transaction={editTransaction}
        properties={properties}
        allUnits={allUnits}
      />
    </div>
  );
}
