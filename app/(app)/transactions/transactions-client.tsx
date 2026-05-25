"use client";

import { useState } from "react";
import { Plus, Paperclip, CheckCircle2, AlertTriangle, MoreHorizontal, Pencil, Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AddTransactionSheet, type TransactionFormData } from "@/components/transactions/add-transaction-sheet";
import { DeleteTransactionDialog, useDeleteDialog } from "@/components/transactions/delete-transaction-button";
import { getCategoryBadgeClass } from "@/lib/categories";

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

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const pageSlice = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
                    <TableCell className="text-center">
                      {tx.attachmentUrl ? (
                        <Paperclip className="size-3.5 text-muted-foreground mx-auto" />
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
              <span>
                Page {page + 1} of {totalPages} ({transactions.length} total)
              </span>
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
            </div>
          )}
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
          onOpenChange={(o) => { if (!o) closeDelete(); }}
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
