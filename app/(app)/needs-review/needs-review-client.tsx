"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Pencil, Paperclip } from "lucide-react";
import { markAsReviewed } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddTransactionSheet, type TransactionFormData } from "@/components/transactions/add-transaction-sheet";
import { getCategoryBadgeClass } from "@/lib/categories";

type TransactionRow = {
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
  unitName: string | null;
  attachmentUrl: string | null;
  attachments: Array<{ id: string; url: string; name: string | null; sizeKb: number | null }>;
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

function MarkReviewedButton({ tx }: { tx: TransactionRow }) {
  const [pending, startTransition] = useTransition();

  // Check if all required fields are complete
  const hasPayee = !!tx.payee;
  const hasCategory = !!tx.category;
  const hasProperty = !!tx.propertyId;
  const hasReceipt = tx.attachments.length > 0 || !!tx.attachmentUrl;

  const isComplete = hasPayee && hasCategory && hasProperty && hasReceipt;

  // Only show button if transaction is incomplete
  if (isComplete) {
    return null;
  }

  function handleClick() {
    startTransition(async () => {
      try {
        await markAsReviewed(tx.id);
        toast.success("Marked as reviewed.");
      } catch {
        toast.error("Something went wrong.");
      }
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs gap-1"
      onClick={handleClick}
      disabled={pending}
    >
      <CheckCircle2 className="size-3" />
      {pending ? "Saving…" : "Mark reviewed"}
    </Button>
  );
}

export function NeedsReviewClient({ transactions, properties, allUnits }: Props) {
  const [editTx, setEditTx] = useState<TransactionFormData | null>(null);

  function openEdit(tx: TransactionRow) {
    setEditTx({
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
      attachments: tx.attachments,
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Needs Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Transactions flagged for review — confirm or correct each one.
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 className="size-12 text-muted-foreground mb-4" />
          <p className="font-medium">Nothing to review — you&apos;re all caught up</p>
          <p className="text-sm text-muted-foreground mt-1">
            Transactions with low OCR confidence or missing fields will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Property</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[1px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow
                  key={tx.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openEdit(tx)}
                >
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDate(tx.date)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1.5">
                      {tx.attachments.length > 0 && (
                        <Paperclip className="size-3 shrink-0 text-muted-foreground" />
                      )}
                      <span>{tx.payee ?? <span className="text-muted-foreground italic">No payee</span>}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tx.category ? (
                      <Badge variant="outline" className={getCategoryBadgeClass(tx.category)}>
                        {tx.subcategory ?? tx.category}
                      </Badge>
                    ) : (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="size-3" /> No category
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tx.propertyName ?? "—"}
                    {tx.unitName && ` · ${tx.unitName}`}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm font-medium whitespace-nowrap ${
                      tx.type === "income" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {formatAmount(tx.amount, tx.type)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); openEdit(tx); }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <MarkReviewedButton tx={tx} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddTransactionSheet
        key={editTx?.id ?? "closed"}
        open={editTx !== null}
        onOpenChange={(open) => { if (!open) setEditTx(null); }}
        transaction={editTx ?? undefined}
        properties={properties}
        allUnits={allUnits}
      />
    </div>
  );
}
