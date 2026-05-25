"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Plus, Paperclip, CheckCircle2, AlertTriangle, MoreHorizontal,
  Pencil, Trash2, Receipt, Search, X, SlidersHorizontal,
} from "lucide-react";
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
import { AddTransactionSheet, type TransactionFormData } from "@/components/transactions/add-transaction-sheet";
import { DeleteTransactionDialog, useDeleteDialog } from "@/components/transactions/delete-transaction-button";
import { AttachmentViewer } from "@/components/transactions/attachment-viewer";
import { getCategoryBadgeClass, CATEGORIES } from "@/lib/categories";

const PAGE_SIZE = 50;

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
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSizeKb: number | null;
  needsReview: boolean | null;
  propertyName: string | null;
  unitName: string | null;
};

type Property = { id: string; name: string };
type Unit = { id: string; propertyId: string | null; name: string };

type Props = {
  transactions: TransactionRow[];
  properties: Property[];
  allUnits: Unit[];
};

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

export function TransactionsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

type TableSectionProps = {
  transactions: TransactionRow[];
  properties: Property[];
  allUnits: Unit[];
  showAddButton?: boolean;
};

export function TransactionsTableSection({
  transactions,
  properties,
  allUnits,
  showAddButton = true,
}: TableSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<TransactionFormData | undefined>();
  const [page, setPage] = useState(0);
  const { deleteId, openDelete, closeDelete } = useDeleteDialog();
  const [viewerTx, setViewerTx] = useState<TransactionRow | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Reset to page 0 whenever filters change
  useEffect(() => {
    setPage(0);
  }, [search, typeFilter, categoryFilter, propertyFilter, dateFrom, dateTo]);

  const hasActiveFilters =
    search.trim() !== "" ||
    typeFilter !== "all" ||
    categoryFilter !== "" ||
    propertyFilter !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("");
    setPropertyFilter("");
    setDateFrom("");
    setDateTo("");
  }

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.payee?.toLowerCase().includes(q) ||
          tx.notes?.toLowerCase().includes(q) ||
          tx.category?.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") result = result.filter((tx) => tx.type === typeFilter);
    if (categoryFilter) result = result.filter((tx) => tx.category === categoryFilter);
    if (propertyFilter) result = result.filter((tx) => tx.propertyId === propertyFilter);
    if (dateFrom) result = result.filter((tx) => tx.date >= dateFrom);
    if (dateTo) result = result.filter((tx) => tx.date <= dateTo);
    return result;
  }, [transactions, search, typeFilter, categoryFilter, propertyFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const pageSlice = filteredTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleOpenAdd() {
    setEditTransaction(undefined);
    setSheetOpen(true);
  }

  function handleEdit(tx: TransactionRow) {
    setEditTransaction({
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      type: tx.type,
      payee: tx.payee,
      category: tx.category,
      subcategory: tx.subcategory,
      propertyId: tx.propertyId,
      unitId: tx.unitId,
      notes: tx.notes,
      attachmentUrl: tx.attachmentUrl,
      attachmentName: tx.attachmentName ?? null,
      attachmentSizeKb: tx.attachmentSizeKb ?? null,
    });
    setSheetOpen(true);
  }

  return (
    <>
      {showAddButton && (
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <Button onClick={handleOpenAdd}>
            <Plus className="size-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      )}

      {!showAddButton && transactions.length > 0 && (
        <div className="flex justify-end mb-2">
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="size-4 mr-1" />
            Add Transaction
          </Button>
        </div>
      )}

      {/* Filter bar — only shown when there are transactions to filter */}
      {transactions.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search payee or notes…"
              className="pl-8 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex rounded-md border overflow-hidden h-9 text-xs shrink-0">
            {(["all", "income", "expense"] as const).map((t) => (
              <button
                key={t}
                className={`px-3 capitalize transition-colors ${
                  typeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
                onClick={() => setTypeFilter(t)}
              >
                {t === "all" ? "All" : t}
              </button>
            ))}
          </div>

          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "")}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {properties.length > 1 && (
            <Select value={propertyFilter} onValueChange={(v) => setPropertyFilter(v ?? "")}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            type="date"
            className="w-[130px] h-9 text-xs"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From date"
          />
          <Input
            type="date"
            className="w-[130px] h-9 text-xs"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="To date"
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={clearFilters}>
              <X className="size-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border rounded-lg bg-muted/30">
          <Receipt className="size-12 text-muted-foreground" />
          <div>
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first transaction to start tracking.
            </p>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="size-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border rounded-lg bg-muted/30">
          <SlidersHorizontal className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No transactions match your filters</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting or clearing your filters.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="size-3.5 mr-1.5" />
            Clear Filters
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
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
                {pageSlice.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="cursor-pointer"
                    onClick={() => handleEdit(tx)}
                  >
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell className="font-medium max-w-[140px] truncate">
                      {tx.payee ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {tx.category ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge
                            className={`text-xs w-fit ${getCategoryBadgeClass(tx.category)}`}
                          >
                            {tx.category}
                          </Badge>
                          {tx.subcategory && (
                            <span className="text-xs text-muted-foreground">{tx.subcategory}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[120px] truncate">
                      {tx.propertyName ?? <span className="text-muted-foreground">—</span>}
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
                      onClick={(e) => {
                        if (tx.attachmentUrl) {
                          e.stopPropagation();
                          setViewerTx(tx);
                        }
                      }}
                    >
                      {tx.attachmentUrl ? (
                        <Paperclip className="size-3.5 text-primary mx-auto cursor-pointer hover:opacity-70" />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-center">
                      {tx.needsReview ? (
                        <AlertTriangle className="size-3.5 text-yellow-500 mx-auto" />
                      ) : (
                        <CheckCircle2 className="size-3.5 text-green-500 mx-auto" />
                      )}
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
                          <DropdownMenuItem onSelect={() => handleEdit(tx)}>
                            <Pencil className="size-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => openDelete(tx.id)}
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
            <span>
              {hasActiveFilters
                ? `${filteredTransactions.length} of ${transactions.length} transactions`
                : `${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`}
              {totalPages > 1 && ` · page ${page + 1} of ${totalPages}`}
            </span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <AddTransactionSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditTransaction(undefined);
        }}
        transaction={editTransaction}
        properties={properties}
        allUnits={allUnits}
      />

      {deleteId && (
        <DeleteTransactionDialog
          id={deleteId}
          open={!!deleteId}
          onOpenChange={(o) => {
            if (!o) closeDelete();
          }}
        />
      )}

      {viewerTx?.attachmentUrl && (
        <AttachmentViewer
          open={!!viewerTx}
          onOpenChange={(o) => { if (!o) setViewerTx(null); }}
          transactionId={viewerTx.id}
          url={viewerTx.attachmentUrl}
          filename={viewerTx.attachmentName}
          sizeKb={viewerTx.attachmentSizeKb}
          onDeleted={() => setViewerTx(null)}
        />
      )}
    </>
  );
}

export function TransactionsClient({ transactions, properties, allUnits }: Props) {
  return (
    <div className="p-6 space-y-4">
      <TransactionsTableSection
        transactions={transactions}
        properties={properties}
        allUnits={allUnits}
        showAddButton
      />
    </div>
  );
}
