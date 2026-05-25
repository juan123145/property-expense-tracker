"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2, RotateCcw } from "lucide-react";
import { restoreTransaction } from "@/app/actions/transactions";
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
import { getCategoryBadgeClass } from "@/lib/categories";

type TransactionRow = {
  id: string;
  date: string;
  amount: string;
  type: string;
  payee: string | null;
  category: string | null;
  subcategory: string | null;
  deletedAt: Date | null;
  propertyName: string | null;
  unitName: string | null;
};

type Props = { transactions: TransactionRow[] };

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

function RestoreButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await restoreTransaction(id);
        toast.success("Transaction restored.");
      } catch {
        toast.error("Something went wrong.");
      }
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs gap-1 shrink-0"
      onClick={handleClick}
      disabled={pending}
    >
      <RotateCcw className="size-3" />
      {pending ? "Restoring…" : "Restore"}
    </Button>
  );
}

export function TrashClient({ transactions }: Props) {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Trash</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Items in Trash are permanently deleted after 30 days.
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trash2 className="size-12 text-muted-foreground mb-4" />
          <p className="font-medium">Trash is empty</p>
          <p className="text-sm text-muted-foreground mt-1">
            Deleted transactions will appear here for 30 days before being permanently removed.
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
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell className="text-sm">
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
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {tx.deletedAt
                        ? new Date(tx.deletedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-medium ${
                          days <= 3 ? "text-destructive" : days <= 7 ? "text-amber-600" : "text-muted-foreground"
                        }`}
                      >
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
      )}
    </div>
  );
}
