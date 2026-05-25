"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createTransaction, updateTransaction } from "@/app/actions/transactions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategorySelect } from "./category-select";

export type TransactionFormData = {
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
};

type Property = { id: string; name: string };
type Unit = { id: string; propertyId: string | null; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: TransactionFormData;
  properties: Property[];
  allUnits: Unit[];
};

export function AddTransactionSheet({
  open,
  onOpenChange,
  transaction,
  properties,
  allUnits,
}: Props) {
  const isEdit = !!transaction;
  const action = isEdit ? updateTransaction : createTransaction;
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  const [txType, setTxType] = useState(transaction?.type ?? "expense");
  const [propertyId, setPropertyId] = useState(transaction?.propertyId ?? "none");
  const [unitId, setUnitId] = useState(transaction?.unitId ?? "none");
  const [amount, setAmount] = useState(transaction?.amount ?? "");
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [subcategory, setSubcategory] = useState(transaction?.subcategory ?? "");

  const filteredUnits = allUnits.filter(
    (u) => propertyId !== "none" && u.propertyId !== null && u.propertyId === propertyId
  );

  useEffect(() => {
    if (open) {
      setTxType(transaction?.type ?? "expense");
      setPropertyId(transaction?.propertyId ?? "none");
      setUnitId(transaction?.unitId ?? "none");
      setAmount(transaction?.amount ?? "");
      setCategory(transaction?.category ?? "");
      setSubcategory(transaction?.subcategory ?? "");
    }
  }, [open, transaction]);

  useEffect(() => {
    if (state?.success) {
      toast.success(isEdit ? "Transaction updated." : "Transaction added.");
      onOpenChange(false);
      formRef.current?.reset();
      setTxType("expense");
      setPropertyId("none");
      setUnitId("none");
      setAmount("");
      setCategory("");
      setSubcategory("");
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</SheetTitle>
        </SheetHeader>
        <form ref={formRef} action={formAction} className="mt-6 space-y-4 px-4 pb-6">
          {isEdit && <input type="hidden" name="id" value={transaction.id} />}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={transaction?.date}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => {
                  const n = parseFloat(amount);
                  if (!isNaN(n)) setAmount(n.toFixed(2));
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <input type="hidden" name="type" value={txType} />
              <Select value={txType} onValueChange={(v) => setTxType(v ?? "expense")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payee">Payee</Label>
              <Input
                id="payee"
                name="payee"
                defaultValue={transaction?.payee ?? ""}
                placeholder="e.g. Home Depot"
              />
            </div>
          </div>

          <CategorySelect
            key={transaction?.id ?? "new"}
            category={category}
            subcategory={subcategory}
            onCategoryChange={(cat) => {
              setCategory(cat);
              setSubcategory("");
            }}
            onSubcategoryChange={setSubcategory}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Property</Label>
              <input
                type="hidden"
                name="propertyId"
                value={propertyId === "none" ? "" : propertyId}
              />
              <Select
                value={propertyId}
                onValueChange={(v) => {
                  setPropertyId(v ?? "none");
                  setUnitId("none");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No property</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <input
                type="hidden"
                name="unitId"
                value={unitId === "none" ? "" : unitId}
              />
              <Select
                value={unitId}
                onValueChange={(v) => setUnitId(v ?? "none")}
              >
                <SelectTrigger
                  className="w-full"
                  disabled={propertyId === "none" || filteredUnits.length === 0}
                >
                  <SelectValue
                    placeholder={
                      propertyId === "none" ? "Select property first" : "No units"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No unit</SelectItem>
                  {filteredUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              name="notes"
              defaultValue={transaction?.notes ?? ""}
              placeholder="Optional notes"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Receipt</Label>
            <div className="flex h-8 items-center rounded-lg border border-input bg-muted/30 px-3 text-xs text-muted-foreground">
              Receipt upload coming in Cycle 4
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Saving…" : isEdit ? "Save Changes" : "Add Transaction"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
