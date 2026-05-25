"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
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
import { ReceiptUploadZone } from "./receipt-upload-zone";

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
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSizeKb: number | null;
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

  // Attachment state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // "keep" = use existing, "clear" = remove existing, "new" = pendingFile replaces
  const [attachmentAction, setAttachmentAction] = useState<"keep" | "clear" | "new">("keep");
  const [uploading, setUploading] = useState(false);

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
      setPendingFile(null);
      setAttachmentAction("keep");
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
      setPendingFile(null);
      setAttachmentAction("keep");
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Handle attachment
    if (attachmentAction === "new" && pendingFile) {
      setUploading(true);
      try {
        const uploadFd = new FormData();
        uploadFd.set("file", pendingFile);
        const res = await fetch("/api/upload", { method: "POST", body: uploadFd });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: "Upload failed." }));
          toast.error(error ?? "Upload failed.");
          setUploading(false);
          return;
        }
        const { url, filename, sizeKb } = await res.json();
        fd.set("attachmentUrl", url);
        fd.set("attachmentName", filename);
        fd.set("attachmentSizeKb", String(sizeKb));
      } catch {
        toast.error("Upload failed. Please try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    } else if (attachmentAction === "clear") {
      fd.set("attachmentUrl", "");
      fd.set("attachmentName", "");
      fd.set("attachmentSizeKb", "");
    } else if (attachmentAction === "keep") {
      // Pass existing values so the server action preserves them
      fd.set("attachmentUrl", transaction?.attachmentUrl ?? "");
      fd.set("attachmentName", transaction?.attachmentName ?? "");
      fd.set("attachmentSizeKb", transaction?.attachmentSizeKb != null ? String(transaction.attachmentSizeKb) : "");
    }

    // Pass existing URL so server can delete from R2 if replaced/cleared
    fd.set("existingAttachmentUrl", transaction?.attachmentUrl ?? "");

    startTransition(() => formAction(fd));
  }

  const isBusy = pending || uploading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</SheetTitle>
        </SheetHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-4 px-4 pb-6">
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
            <ReceiptUploadZone
              file={pendingFile}
              onFileChange={(f) => {
                setPendingFile(f);
                setAttachmentAction(f ? "new" : "keep");
              }}
              existingUrl={attachmentAction !== "clear" ? transaction?.attachmentUrl : null}
              existingName={transaction?.attachmentName}
              existingSizeKb={transaction?.attachmentSizeKb}
              onClear={() => {
                setPendingFile(null);
                setAttachmentAction(isEdit && transaction?.attachmentUrl ? "clear" : "keep");
              }}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isBusy} className="flex-1">
              {uploading ? "Uploading…" : pending ? "Saving…" : isEdit ? "Save Changes" : "Add Transaction"}
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
