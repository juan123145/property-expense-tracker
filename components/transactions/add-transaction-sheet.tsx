"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { createTransaction, updateTransaction } from "@/app/actions/transactions";
import type { OcrResult } from "@/lib/ocr";
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
import { DatePickerInput } from "@/components/ui/date-picker";

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

  // Form field state (all controlled so OCR can pre-fill)
  const [date, setDate] = useState(transaction?.date ?? "");
  const [txType, setTxType] = useState(transaction?.type ?? "expense");
  const [propertyId, setPropertyId] = useState(transaction?.propertyId ?? "none");
  const [unitId, setUnitId] = useState(transaction?.unitId ?? "none");
  const [amount, setAmount] = useState(transaction?.amount ?? "");
  const [payee, setPayee] = useState(transaction?.payee ?? "");
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [subcategory, setSubcategory] = useState(transaction?.subcategory ?? "");

  // Attachment state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [attachmentAction, setAttachmentAction] = useState<"keep" | "clear" | "new">("keep");
  const [uploading, setUploading] = useState(false);

  // OCR state
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const filteredUnits = allUnits.filter(
    (u) => propertyId !== "none" && u.propertyId !== null && u.propertyId === propertyId
  );

  // Reset everything when sheet opens/closes or switches between transactions
  useEffect(() => {
    if (open) {
      setDate(transaction?.date ?? "");
      setTxType(transaction?.type ?? "expense");
      setPropertyId(transaction?.propertyId ?? "none");
      setUnitId(transaction?.unitId ?? "none");
      setAmount(transaction?.amount ?? "");
      setPayee(transaction?.payee ?? "");
      setCategory(transaction?.category ?? "");
      setSubcategory(transaction?.subcategory ?? "");
      setPendingFile(null);
      setAttachmentAction("keep");
      setOcrResult(null);
      setOcrScanning(false);
    }
  }, [open, transaction]);

  // Run OCR whenever a new image file is selected
  useEffect(() => {
    const isOcrSupported =
      pendingFile?.type.startsWith("image/") || pendingFile?.type === "application/pdf";
    if (!pendingFile || !isOcrSupported) {
      setOcrResult(null);
      setOcrScanning(false);
      return;
    }

    let cancelled = false;
    setOcrScanning(true);
    setOcrResult(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const fd = new FormData();
    fd.set("file", pendingFile);

    fetch("/api/ocr", { method: "POST", body: fd, signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((result: OcrResult | null) => {
        if (cancelled || !result) return;
        setOcrResult(result);
        // Only pre-fill fields that the user hasn't touched yet
        if (result.date && !date) setDate(result.date);
        if (result.amount && !amount) setAmount(result.amount);
        if (result.payee && !payee) setPayee(result.payee);
        if (result.category && !category) {
          setCategory(result.category);
          setSubcategory("");
        }
      })
      .catch(() => {/* non-fatal */})
      .finally(() => {
        clearTimeout(timeout);
        if (!cancelled) setOcrScanning(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile]);

  // Handle server action response
  useEffect(() => {
    if (state?.success) {
      toast.success(isEdit ? "Transaction updated." : "Transaction added.");
      onOpenChange(false);
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

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
    } else {
      fd.set("attachmentUrl", transaction?.attachmentUrl ?? "");
      fd.set("attachmentName", transaction?.attachmentName ?? "");
      fd.set("attachmentSizeKb", transaction?.attachmentSizeKb != null ? String(transaction.attachmentSizeKb) : "");
    }

    fd.set("existingAttachmentUrl", transaction?.attachmentUrl ?? "");

    // Pass OCR confidence and needsReview flag
    if (ocrResult) {
      fd.set("ocrConfidence", String(ocrResult.confidence));
      fd.set("needsReview", ocrResult.confidence < 0.7 ? "true" : "false");
    }

    startTransition(() => formAction(fd));
  }

  const isBusy = pending || uploading;
  const hasOcrFields = ocrResult && (ocrResult.date || ocrResult.amount || ocrResult.payee);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</SheetTitle>
        </SheetHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-4 px-4 pb-6">
          {isEdit && <input type="hidden" name="id" value={transaction.id} />}

          {/* OCR banner */}
          {ocrScanning && (
            <div className="flex items-center gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              <Loader2 className="size-3.5 animate-spin shrink-0" />
              Scanning receipt — fields will be filled automatically…
            </div>
          )}
          {!ocrScanning && hasOcrFields && ocrResult.confidence >= 0.7 && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
              <CheckCircle2 className="size-3.5 shrink-0" />
              Auto-filled from receipt — please confirm the values below
            </div>
          )}
          {!ocrScanning && hasOcrFields && ocrResult.confidence < 0.7 && (
            <div className="flex items-center gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-700">
              <AlertTriangle className="size-3.5 shrink-0" />
              Low confidence scan — please review and fill in manually
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Date *
              </Label>
              {/* hidden input carries value for FormData */}
              <input type="hidden" name="date" value={date} />
              <DatePickerInput
                value={date}
                onChange={setDate}
                placeholder="Pick a date"
                scanning={ocrScanning}
                disabled={isBusy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">
                Amount *
                {ocrScanning && <Loader2 className="inline ml-1 size-3 animate-spin text-muted-foreground" />}
              </Label>
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
              <Label htmlFor="payee">
                Payee
                {ocrScanning && <Loader2 className="inline ml-1 size-3 animate-spin text-muted-foreground" />}
              </Label>
              <Input
                id="payee"
                name="payee"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                placeholder="e.g. Home Depot"
              />
            </div>
          </div>

          <div>
            {ocrScanning && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Loader2 className="size-3 animate-spin" />
                Detecting category…
              </div>
            )}
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
          </div>

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
              scanning={ocrScanning}
              onFileChange={(f) => {
                setPendingFile(f);
                setAttachmentAction(f ? "new" : "keep");
              }}
              existingUrl={attachmentAction !== "clear" ? transaction?.attachmentUrl : null}
              existingName={transaction?.attachmentName}
              existingSizeKb={transaction?.attachmentSizeKb}
              onClear={() => {
                setPendingFile(null);
                setOcrResult(null);
                setAttachmentAction(isEdit && transaction?.attachmentUrl ? "clear" : "keep");
              }}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isBusy || ocrScanning} className="flex-1">
              {uploading
                ? "Uploading…"
                : pending
                ? "Saving…"
                : ocrScanning
                ? "Scanning…"
                : isEdit
                ? "Save Changes"
                : "Add Transaction"}
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
