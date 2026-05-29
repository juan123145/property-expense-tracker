"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import type { DatePreset } from "@/lib/date-ranges";
import { AddTransactionSheet, type TransactionFormData } from "@/components/transactions/add-transaction-sheet";
import { DeleteTransactionDialog, useDeleteDialog } from "@/components/transactions/delete-transaction-button";
import { AttachmentViewer } from "@/components/transactions/attachment-viewer";
import { getCategoryBadgeClass, CATEGORIES } from "@/lib/categories";
import { markAsReviewed, restoreTransaction, permanentlyDeleteTransaction } from "@/app/actions/transactions";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export type TrashedRow = {
  id: string;
  date: string;
  amount: string;
  type: string;
  payee: string | null;
  category: string | null;
  subcategory: string | null;
  notes: string | null;
  propertyId: string | null;
  unitId: string | null;
  deletedAt: Date | null;
  propertyName: string | null;
  propertyImage: string | null;
  unitName: string | null;
  attachments: Array<{ id: string; url: string; name: string | null; sizeKb: number | null }>;
};

type Property = { id: string; name: string };
type Unit = { id: string; propertyId: string | null; name: string };

type TabValue = "all" | "needs-review" | "trash";

type Props = {
  activeTab: TabValue;
  transactions: TransactionRow[];
  trashedTransactions: TrashedRow[];
  properties: Property[];
  allUnits: Unit[];
  userId: string;
  allCount: number;
  needsReviewCount: number;
  trashCount: number;
  totalCount: number;
  currentPage: number;
  currentPageSize: number;
};

type PushUrl = (patches: Record<string, string | null>) => void;

// ─── Formatters ───────────────────────────────────────────────────────────────

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

// ─── Missing-field chips ──────────────────────────────────────────────────────

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

// ─── Mobile transaction card ──────────────────────────────────────────────────

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

// ─── Filter state (local mode only) ──────────────────────────────────────────

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

// ─── Action buttons ───────────────────────────────────────────────────────────

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

function PermanentDeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <Button
        size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0 text-destructive hover:text-destructive"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-3" />
        {pending ? "Deleting…" : "Delete permanently"}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the transaction, all its receipts, and free up your storage quota.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
              onClick={() => startTransition(async () => {
                try {
                  await permanentlyDeleteTransaction(id);
                  toast.success("Transaction permanently deleted.");
                  setConfirmOpen(false);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Something went wrong.";
                  toast.error(msg);
                  setConfirmOpen(false);
                }
              })}
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TrashedTransactionDialog({
  tx,
  open,
  onOpenChange,
  onViewAttachments,
}: {
  tx: TrashedRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewAttachments: (tx: TrashedRow) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tx.payee ?? "Transaction"}</DialogTitle>
          <DialogDescription>
            Deleted on {tx.deletedAt
              ? new Date(tx.deletedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              : "unknown date"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{formatDate(tx.date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className={`font-medium ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                {formatAmount(tx.amount, tx.type)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{tx.type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="font-medium">{tx.category ?? "—"}</p>
            </div>
            {tx.subcategory && (
              <div>
                <p className="text-xs text-muted-foreground">Subcategory</p>
                <p className="font-medium">{tx.subcategory}</p>
              </div>
            )}
            {tx.propertyName && (
              <div>
                <p className="text-xs text-muted-foreground">Property</p>
                <p className="font-medium">{tx.propertyName}{tx.unitName && ` · ${tx.unitName}`}</p>
              </div>
            )}
          </div>
          {tx.notes && (
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm bg-muted/50 rounded p-2">{tx.notes}</p>
            </div>
          )}
          {tx.attachments.length > 0 && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => { onOpenChange(false); onViewAttachments(tx); }}
              >
                <Paperclip className="size-3.5" />
                View {tx.attachments.length} receipt{tx.attachments.length !== 1 ? "s" : ""}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transaction table rows (shared renderer) ─────────────────────────────────

function TransactionTableRows({
  transactions,
  onEdit,
  onDelete,
  setViewerTx,
}: {
  transactions: TransactionRow[];
  onEdit: (tx: TransactionRow) => void;
  onDelete: (id: string) => void;
  setViewerTx: (tx: TransactionRow | null) => void;
}) {
  return (
    <>
      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {transactions.map((tx) => (
          <TransactionCard key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} onViewAttachments={setViewerTx} />
        ))}
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
            {transactions.map((tx) => (
              <TableRow
                key={tx.id}
                className={cn(
                  "cursor-pointer",
                  tx.needsReview
                    ? "border-l-2 border-l-amber-400 bg-amber-50/30 hover:bg-amber-50/50 dark:bg-amber-950/10 dark:hover:bg-amber-950/20"
                    : "hover:bg-muted/30"
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
                <TableCell
                  className="text-center"
                  onClick={(e) => { if (tx.attachments.length > 0) { e.stopPropagation(); setViewerTx(tx); } }}
                >
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
                    <DropdownMenuTrigger
                      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                      aria-label="Row actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(tx)}><Pencil className="size-3.5 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => onDelete(tx.id)}><Trash2 className="size-3.5 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ─── Pagination footer (shared across all tab content components) ─────────────

function PaginationFooter({
  totalCount,
  currentPage,
  totalPages,
  hasActiveFilters,
  onPrevious,
  onNext,
  label = "transaction",
}: {
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasActiveFilters: boolean;
  onPrevious: () => void;
  onNext: () => void;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
      <span>
        {hasActiveFilters
          ? `${totalCount} matching ${label}${totalCount !== 1 ? "s" : ""}`
          : `${totalCount} ${label}${totalCount !== 1 ? "s" : ""}`}
        {totalPages > 1 && ` · page ${currentPage} of ${totalPages}`}
      </span>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={onPrevious}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={onNext}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Shared filter bar (URL-driven, used by all three tabs) ───────────────────

function SharedFilterBar({
  properties,
  currentPageSize,
  pushUrl,
}: {
  properties: Property[];
  currentPageSize: number;
  pushUrl: PushUrl;
}) {
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const typeFilter = searchParams.get("type") ?? "all";
  const categoryFilter = searchParams.get("category") ?? "";
  const propertyFilter = searchParams.get("propertyId") ?? "";
  const datePreset = (searchParams.get("datePreset") ?? "all") as DatePreset;
  const dateStart = searchParams.get("dateStart") ?? "";
  const dateEnd = searchParams.get("dateEnd") ?? "";
  const dateRange: DateRangeValue = { preset: datePreset, start: dateStart, end: dateEnd };

  const hasActiveFilters =
    search.trim() !== "" ||
    typeFilter !== "all" ||
    categoryFilter !== "" ||
    propertyFilter !== "" ||
    datePreset !== "all";

  function handleSearchChange(value: string) {
    pushUrl({ search: value || null, page: null });
  }
  function handleTypeChange(value: string) {
    pushUrl({ type: value === "all" ? null : value, page: null });
  }
  function handleCategoryChange(value: string) {
    pushUrl({ category: value === "all" ? null : value, page: null });
  }
  function handlePropertyChange(value: string) {
    pushUrl({ propertyId: value === "all" ? null : value, page: null });
  }
  function handleDateRangeChange(range: DateRangeValue) {
    if (range.preset === "all") {
      pushUrl({ datePreset: null, dateStart: null, dateEnd: null, page: null });
    } else {
      pushUrl({
        datePreset: range.preset,
        dateStart: range.start || null,
        dateEnd: range.end || null,
        page: null,
      });
    }
  }
  function handlePageSizeChange(newSize: number) {
    pushUrl({ pageSize: String(newSize), page: null });
  }
  function handleClearFilters() {
    pushUrl({
      search: null, type: null, category: null, propertyId: null,
      datePreset: null, dateStart: null, dateEnd: null, page: null,
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search for..."
            className="pl-8 !h-9 text-sm"
            defaultValue={search}
            key={search}
            onBlur={(e) => { if (e.target.value !== search) handleSearchChange(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearchChange((e.target as HTMLInputElement).value); }}
          />
        </div>
        {properties.length > 0 && (
          <Select value={propertyFilter || "all"} onValueChange={(v) => handlePropertyChange(v ?? "all")}>
            <SelectTrigger className="!h-9 text-sm w-[180px] bg-background">
              <SelectValue>
                {propertyFilter
                  ? (properties.find((p) => p.id === propertyFilter)?.name ?? "All Properties")
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

      <div className="flex flex-wrap gap-2 items-center">
        <DateRangePicker value={dateRange} onChange={handleDateRangeChange} className="!h-9 text-sm" />
        <Select value={categoryFilter || "all"} onValueChange={(v) => handleCategoryChange(v ?? "all")}>
          <SelectTrigger className="!h-9 text-sm w-[160px] bg-background">
            <SelectValue>{categoryFilter || "All Categories"}</SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => handleTypeChange(v ?? "all")}>
          <SelectTrigger className="!h-9 text-sm w-[140px] bg-background">
            <SelectValue>
              {typeFilter === "income" ? "Money in" : typeFilter === "expense" ? "Money out" : "All amounts"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">All amounts</SelectItem>
            <SelectItem value="income">Money in</SelectItem>
            <SelectItem value="expense">Money out</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(currentPageSize)} onValueChange={(v) => { if (v) handlePageSizeChange(parseInt(v)); }}>
          <SelectTrigger className="!h-9 text-sm w-[120px] bg-background">
            <SelectValue>{currentPageSize} per page</SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>{size} per page</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="!h-9 px-3 text-sm text-muted-foreground" onClick={handleClearFilters}>
            <X className="size-3.5 mr-1" />Clear
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── All Transactions tab content ─────────────────────────────────────────────

function AllTransactionsContent({
  transactions,
  totalCount,
  currentPage,
  currentPageSize,
  hasActiveFilters,
  onEdit,
  pushUrl,
}: {
  transactions: TransactionRow[];
  totalCount: number;
  currentPage: number;
  currentPageSize: number;
  hasActiveFilters: boolean;
  onEdit: (tx: TransactionRow) => void;
  pushUrl: PushUrl;
}) {
  const { deleteId, openDelete, closeDelete } = useDeleteDialog();
  const [viewerTx, setViewerTx] = useState<TransactionRow | null>(null);
  const totalPages = Math.max(1, Math.ceil(totalCount / currentPageSize));

  if (totalCount === 0 && !hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border rounded-lg bg-muted/30">
        <Receipt className="size-12 text-muted-foreground" />
        <div>
          <p className="font-medium">No transactions yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first transaction to start tracking.</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border rounded-lg bg-muted/30">
        <SlidersHorizontal className="size-10 text-muted-foreground" />
        <div>
          <p className="font-medium">No transactions match your filters</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting or clearing your filters.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TransactionTableRows
        transactions={transactions}
        onEdit={onEdit}
        onDelete={openDelete}
        setViewerTx={setViewerTx}
      />
      <PaginationFooter
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        hasActiveFilters={hasActiveFilters}
        onPrevious={() => pushUrl({ page: currentPage <= 2 ? null : String(currentPage - 1) })}
        onNext={() => pushUrl({ page: String(currentPage + 1) })}
      />
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
    </>
  );
}

// ─── Needs Review tab content ─────────────────────────────────────────────────

function NeedsReviewContent({
  transactions,
  totalCount,
  currentPage,
  currentPageSize,
  hasActiveFilters,
  onEdit,
  pushUrl,
}: {
  transactions: TransactionRow[];
  totalCount: number;
  currentPage: number;
  currentPageSize: number;
  hasActiveFilters: boolean;
  onEdit: (tx: TransactionRow) => void;
  pushUrl: PushUrl;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / currentPageSize));

  if (totalCount === 0 && !hasActiveFilters) {
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

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border rounded-lg bg-muted/30">
        <SlidersHorizontal className="size-10 text-muted-foreground" />
        <div>
          <p className="font-medium">No review items match your filters</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting or clearing your filters.</p>
        </div>
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
                <p className="text-sm font-medium truncate">
                  {tx.payee ?? <span className="text-muted-foreground italic">No payee</span>}
                </p>
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

      <PaginationFooter
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        hasActiveFilters={hasActiveFilters}
        onPrevious={() => pushUrl({ page: currentPage <= 2 ? null : String(currentPage - 1) })}
        onNext={() => pushUrl({ page: String(currentPage + 1) })}
        label="review item"
      />
    </>
  );
}

// ─── Trash tab content ────────────────────────────────────────────────────────

function TrashContent({
  trashedTransactions,
  totalCount,
  currentPage,
  currentPageSize,
  hasActiveFilters,
  pushUrl,
}: {
  trashedTransactions: TrashedRow[];
  totalCount: number;
  currentPage: number;
  currentPageSize: number;
  hasActiveFilters: boolean;
  pushUrl: PushUrl;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / currentPageSize));
  const [selectedTx, setSelectedTx] = useState<TrashedRow | null>(null);
  const [viewerTx, setViewerTx] = useState<TrashedRow | null>(null);

  if (totalCount === 0 && !hasActiveFilters) {
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

  if (trashedTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border rounded-lg bg-muted/30">
        <SlidersHorizontal className="size-10 text-muted-foreground" />
        <div>
          <p className="font-medium">No trash items match your filters</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting or clearing your filters.</p>
        </div>
      </div>
    );
  }

  return (
    <>
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
            {trashedTransactions.map((tx) => {
              const days = daysUntilDeletion(tx.deletedAt);
              return (
                <TableRow
                  key={tx.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setSelectedTx(tx)}
                >
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {tx.attachments.length > 0 && (
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={(e) => { e.stopPropagation(); setViewerTx(tx); }}
                          aria-label="View receipts"
                        >
                          <Paperclip className="size-3.5 text-primary" />
                        </Button>
                      )}
                      <RestoreButton id={tx.id} />
                      <PermanentDeleteButton id={tx.id} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <PaginationFooter
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        hasActiveFilters={hasActiveFilters}
        onPrevious={() => pushUrl({ page: currentPage <= 2 ? null : String(currentPage - 1) })}
        onNext={() => pushUrl({ page: String(currentPage + 1) })}
        label="deleted transaction"
      />

      {selectedTx && (
        <TrashedTransactionDialog
          tx={selectedTx}
          open={!!selectedTx}
          onOpenChange={(o) => { if (!o) setSelectedTx(null); }}
          onViewAttachments={(tx) => setViewerTx(tx)}
        />
      )}

      {viewerTx && viewerTx.attachments.length > 0 && (
        <AttachmentViewer
          open={!!viewerTx}
          onOpenChange={(o) => { if (!o) setViewerTx(null); }}
          transactionId={viewerTx.id}
          attachments={viewerTx.attachments}
          onDeleted={() => setViewerTx(null)}
          readOnly
        />
      )}
    </>
  );
}

// ─── Local mode (property detail embed) ──────────────────────────────────────

type TableSectionProps = {
  transactions: TransactionRow[];
  properties: Property[];
  allUnits: Unit[];
  onOpenAdd: () => void;
  onEdit: (tx: TransactionRow) => void;
};

function LocalModeTab({ transactions, properties, allUnits, onOpenAdd, onEdit }: TableSectionProps) {
  const { deleteId, openDelete, closeDelete } = useDeleteDialog();
  const [viewerTx, setViewerTx] = useState<TransactionRow | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.typeFilter !== "all" ||
    filters.categoryFilter !== "" ||
    filters.propertyFilter !== "" ||
    filters.dateRange.preset !== "all";

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.payee?.toLowerCase().includes(q) ||
          tx.notes?.toLowerCase().includes(q) ||
          tx.category?.toLowerCase().includes(q),
      );
    }
    if (filters.typeFilter !== "all") {
      result = result.filter((tx) => tx.type === filters.typeFilter);
    }
    if (filters.categoryFilter) {
      result = result.filter((tx) => tx.category === filters.categoryFilter);
    }
    if (filters.propertyFilter) {
      result = result.filter((tx) => tx.propertyId === filters.propertyFilter);
    }
    if (filters.dateRange.start && filters.dateRange.end) {
      result = result.filter(
        (tx) => tx.date >= filters.dateRange.start && tx.date <= filters.dateRange.end,
      );
    }
    return result;
  }, [transactions, filters]);

  function patchFilters(patch: Partial<FilterState>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border rounded-lg bg-muted/30">
        <Receipt className="size-12 text-muted-foreground" />
        <div>
          <p className="font-medium">No transactions yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first transaction to start tracking.</p>
        </div>
        <Button onClick={onOpenAdd}><Plus className="size-4 mr-2" />Add Transaction</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 space-y-2">
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
            <Select value={filters.propertyFilter || "all"} onValueChange={(v) => patchFilters({ propertyFilter: (!v || v === "all") ? "" : v })}>
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
        <div className="flex flex-wrap gap-2 items-center">
          <DateRangePicker
            value={filters.dateRange}
            onChange={(range) => patchFilters({ dateRange: range })}
            className="!h-9 text-sm"
          />
          <Select value={filters.categoryFilter || "all"} onValueChange={(v) => patchFilters({ categoryFilter: (!v || v === "all") ? "" : v })}>
            <SelectTrigger className="!h-9 text-sm w-[160px] bg-background">
              <SelectValue>{filters.categoryFilter || "All Categories"}</SelectValue>
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
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="!h-9 px-3 text-sm text-muted-foreground" onClick={() => setFilters(DEFAULT_FILTERS)}>
              <X className="size-3.5 mr-1" />Clear
            </Button>
          )}
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border rounded-lg bg-muted/30">
          <SlidersHorizontal className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No transactions match your filters</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting or clearing your filters.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
            <X className="size-3.5 mr-1.5" />Clear Filters
          </Button>
        </div>
      ) : (
        <>
          <TransactionTableRows
            transactions={filteredTransactions}
            onEdit={onEdit}
            onDelete={openDelete}
            setViewerTx={setViewerTx}
          />
          <div className="pt-3 text-sm text-muted-foreground">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
            {hasActiveFilters && ` of ${transactions.length} total`}
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

// ─── TransactionsTableSection — property detail embed ────────────────────────

export function TransactionsTableSection({
  transactions,
  properties,
  allUnits,
  showAddButton = true,
  isSingleProperty = false,
  defaultPageSize: _defaultPageSize,
}: {
  transactions: TransactionRow[];
  properties: Property[];
  allUnits: Unit[];
  showAddButton?: boolean;
  isSingleProperty?: boolean;
  defaultPageSize?: number;
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
      {showAddButton && transactions.length > 0 && (
        <div className="flex justify-end mb-2">
          <Button size="sm" onClick={handleOpenAdd}><Plus className="size-4 mr-1" />Add Transaction</Button>
        </div>
      )}
      <LocalModeTab
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

// ─── Property detail server-driven section ───────────────────────────────────

export function PropertyTransactionsSection({
  transactions,
  properties,
  allUnits,
  totalCount,
  currentPage,
  currentPageSize,
}: {
  transactions: TransactionRow[];
  properties: Property[];
  allUnits: Unit[];
  totalCount: number;
  currentPage: number;
  currentPageSize: number;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<TransactionFormData | undefined>();
  const { deleteId, openDelete, closeDelete } = useDeleteDialog();
  const [viewerTx, setViewerTx] = useState<TransactionRow | null>(null);

  const ptSearch = searchParams.get("pt_search") ?? "";
  const ptType = searchParams.get("pt_type") ?? "all";
  const ptCategory = searchParams.get("pt_category") ?? "";
  const hasActiveFilters = ptSearch.trim() !== "" || ptType !== "all" || ptCategory !== "";
  const totalPages = Math.max(1, Math.ceil(totalCount / currentPageSize));

  function buildUrl(patches: Record<string, string | null>): string {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patches)) {
      if (v === null || v === "") { params.delete(k); } else { params.set(k, v); }
    }
    return `?${params.toString()}`;
  }

  function pushUrl(patches: Record<string, string | null>) {
    startTransition(() => { router.push(buildUrl(patches)); });
  }

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
    <div className={cn("space-y-3", isPending && "opacity-60 pointer-events-none transition-opacity")}>
      {/* Compact filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search..."
            className="pl-8 !h-8 text-sm"
            defaultValue={ptSearch}
            key={ptSearch}
            onBlur={(e) => { if (e.target.value !== ptSearch) pushUrl({ pt_search: e.target.value || null, pt_page: null }); }}
            onKeyDown={(e) => { if (e.key === "Enter") pushUrl({ pt_search: (e.target as HTMLInputElement).value || null, pt_page: null }); }}
          />
        </div>
        <Select value={ptCategory || "all"} onValueChange={(v) => pushUrl({ pt_category: v === "all" ? null : v, pt_page: null })}>
          <SelectTrigger className="!h-8 text-sm w-[150px] bg-background">
            <SelectValue>{ptCategory || "All Categories"}</SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ptType} onValueChange={(v) => pushUrl({ pt_type: v === "all" ? null : v, pt_page: null })}>
          <SelectTrigger className="!h-8 text-sm w-[130px] bg-background">
            <SelectValue>
              {ptType === "income" ? "Money in" : ptType === "expense" ? "Money out" : "All amounts"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">All amounts</SelectItem>
            <SelectItem value="income">Money in</SelectItem>
            <SelectItem value="expense">Money out</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="!h-8 px-2 text-sm text-muted-foreground"
            onClick={() => pushUrl({ pt_search: null, pt_type: null, pt_category: null, pt_page: null })}>
            <X className="size-3.5 mr-1" />Clear
          </Button>
        )}
        <div className="ml-auto">
          <Button size="sm" onClick={handleOpenAdd}><Plus className="size-4 mr-1" />Add Transaction</Button>
        </div>
      </div>

      {totalCount === 0 && !hasActiveFilters ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4 border rounded-lg bg-muted/30">
          <Receipt className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first transaction to start tracking.</p>
          </div>
          <Button onClick={handleOpenAdd}><Plus className="size-4 mr-2" />Add Transaction</Button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3 border rounded-lg bg-muted/30">
          <SlidersHorizontal className="size-8 text-muted-foreground" />
          <p className="font-medium text-sm">No transactions match your filters</p>
        </div>
      ) : (
        <>
          <TransactionTableRows
            transactions={transactions}
            onEdit={handleEdit}
            onDelete={openDelete}
            setViewerTx={setViewerTx}
          />
          <PaginationFooter
            totalCount={totalCount}
            currentPage={currentPage}
            totalPages={totalPages}
            hasActiveFilters={hasActiveFilters}
            onPrevious={() => pushUrl({ pt_page: currentPage <= 2 ? null : String(currentPage - 1) })}
            onNext={() => pushUrl({ pt_page: String(currentPage + 1) })}
          />
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

// ─── Root client component ────────────────────────────────────────────────────

export function TransactionsClient({
  activeTab,
  transactions,
  trashedTransactions,
  properties,
  allUnits,
  userId: _userId,
  allCount,
  needsReviewCount,
  trashCount,
  totalCount,
  currentPage,
  currentPageSize,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<TransactionFormData | undefined>();

  // Compute hasActiveFilters for empty states — reads from URL, no local copy
  const search = searchParams.get("search") ?? "";
  const typeFilter = searchParams.get("type") ?? "all";
  const categoryFilter = searchParams.get("category") ?? "";
  const propertyFilter = searchParams.get("propertyId") ?? "";
  const datePreset = searchParams.get("datePreset") ?? "all";
  const hasActiveFilters =
    search.trim() !== "" ||
    typeFilter !== "all" ||
    categoryFilter !== "" ||
    propertyFilter !== "" ||
    datePreset !== "all";

  function buildUrl(patches: Record<string, string | null>): string {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patches)) {
      if (v === null || v === "") { params.delete(k); } else { params.set(k, v); }
    }
    return `/transactions?${params.toString()}`;
  }

  function pushUrl(patches: Record<string, string | null>) {
    startTransition(() => { router.push(buildUrl(patches)); });
  }

  function handleTabChange(newTab: TabValue) {
    // Switching tabs resets page to 1; filters and pageSize are preserved
    pushUrl({ tab: newTab === "all" ? null : newTab, page: null });
  }

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

  const tabs: Array<{ id: TabValue; label: string; count: number | undefined }> = [
    { id: "all", label: "All Transactions", count: undefined },
    { id: "needs-review", label: "Needs Review", count: needsReviewCount > 0 ? needsReviewCount : undefined },
    { id: "trash", label: "Trash", count: undefined },
  ];

  return (
    <div className={cn("p-4 md:p-6 space-y-4", isPending && "opacity-60 pointer-events-none transition-opacity")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button onClick={handleOpenAdd} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Tab nav */}
      <div className="flex gap-0 border-b">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap",
              activeTab === id
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {count !== undefined && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Shared filter bar — applies to all tabs */}
      <SharedFilterBar
        properties={properties}
        currentPageSize={currentPageSize}
        pushUrl={pushUrl}
      />

      {/* Tab content */}
      {activeTab === "all" && (
        <AllTransactionsContent
          transactions={transactions}
          totalCount={totalCount}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          hasActiveFilters={hasActiveFilters}
          onEdit={handleEdit}
          pushUrl={pushUrl}
        />
      )}
      {activeTab === "needs-review" && (
        <NeedsReviewContent
          transactions={transactions}
          totalCount={totalCount}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          hasActiveFilters={hasActiveFilters}
          onEdit={handleEdit}
          pushUrl={pushUrl}
        />
      )}
      {activeTab === "trash" && (
        <TrashContent
          trashedTransactions={trashedTransactions}
          totalCount={totalCount}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          hasActiveFilters={hasActiveFilters}
          pushUrl={pushUrl}
        />
      )}

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
