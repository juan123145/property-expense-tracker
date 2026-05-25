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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryPicker } from "./category-picker";
import { ReceiptUploadZone } from "./receipt-upload-zone";
import { DatePickerInput } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

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
  attachments: Array<{ id: string; url: string; name: string | null; sizeKb: number | null }>;
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
  const processedStateRef = useRef<unknown>(null);

  // ─── Form fields ────────────────────────────────────────────────────────────
  const [date, setDate] = useState(transaction?.date ?? "");
  const [txType, setTxType] = useState(transaction?.type ?? "expense");
  const [propertyId, setPropertyId] = useState(transaction?.propertyId ?? "none");
  const [unitId, setUnitId] = useState(transaction?.unitId ?? "none");
  const [amount, setAmount] = useState(transaction?.amount ?? "");
  const [payee, setPayee] = useState(transaction?.payee ?? "");
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [subcategory, setSubcategory] = useState(transaction?.subcategory ?? "");

  // ─── OCR tracking ───────────────────────────────────────────────────────────
  const [ocrFilledFields, setOcrFilledFields] = useState<Set<string>>(new Set());
  // Tracks which File objects have already been submitted for OCR in this session
  const ocrScannedRef = useRef<WeakSet<File>>(new WeakSet());

  // ─── Attachment state ────────────────────────────────────────────────────────
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // ─── OCR scanning state ──────────────────────────────────────────────────────
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const filteredUnits = allUnits.filter(
    (u) => propertyId !== "none" && u.propertyId !== null && u.propertyId === propertyId
  );

  function removeFromOcrFields(field: string) {
    setOcrFilledFields((prev) => { const s = new Set(prev); s.delete(field); return s; });
  }

  function clearOcrFilledFields() {
    const filled = ocrFilledFields;
    if (filled.has("date")) setDate("");
    if (filled.has("amount")) setAmount("");
    if (filled.has("payee")) setPayee("");
    if (filled.has("category")) { setCategory(""); setSubcategory(""); }
    setOcrFilledFields(new Set());
  }

  // ─── Reset on open/close ─────────────────────────────────────────────────────
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
      setPendingFiles([]);
      setAttachmentsToDelete([]);
      setOcrResult(null);
      setOcrScanning(false);
      setOcrFilledFields(new Set());
      ocrScannedRef.current = new WeakSet();
    }
  }, [open, transaction]);

  // ─── OCR: scan any newly added files, filling only empty fields ───────────────
  useEffect(() => {
    const toScan = pendingFiles.filter((f) => {
      const supported = f.type.startsWith("image/") || f.type === "application/pdf";
      return supported && !ocrScannedRef.current.has(f);
    });
    if (toScan.length === 0) return;

    // Mark as scanned immediately to prevent duplicate triggers
    toScan.forEach((f) => ocrScannedRef.current.add(f));

    let cancelled = false;

    const runScans = async () => {
      setOcrScanning(true);

      // Full replacement: all existing attachments removed and new files being added.
      // Treat fields as empty so OCR can re-fill from the new receipt.
      const allExistingRemoved = isEdit &&
        (transaction?.attachments.length ?? 0) > 0 &&
        attachmentsToDelete.length >= (transaction?.attachments.length ?? 0);
      const initials = allExistingRemoved
        ? { date: "", amount: "", payee: "", category: "" }
        : { date, amount, payee, category };
      // Copy current OCR-filled set; we'll add to it as more fields get filled
      const filled = new Set<string>(ocrFilledFields);

      for (const file of toScan) {
        if (cancelled) break;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        const fd = new FormData();
        fd.set("file", file);

        try {
          const res = await fetch("/api/ocr", {
            method: "POST",
            body: fd,
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!res.ok || cancelled) continue;

          const result: OcrResult = await res.json();
          if (cancelled) break;

          setOcrResult(result);

          if (result.date && !initials.date && !filled.has("date")) {
            setDate(result.date); filled.add("date");
          }
          if (result.amount && !initials.amount && !filled.has("amount")) {
            setAmount(result.amount); filled.add("amount");
          }
          if (result.payee && !initials.payee && !filled.has("payee")) {
            setPayee(result.payee); filled.add("payee");
          }
          if (result.category && !initials.category && !filled.has("category")) {
            setCategory(result.category);
            setSubcategory("");
            filled.add("category");
          }
          setOcrFilledFields(new Set(filled));

          // All key fields filled — no need to scan remaining files
          if (
            filled.has("date") &&
            filled.has("amount") &&
            filled.has("payee") &&
            filled.has("category")
          ) break;
        } catch {
          clearTimeout(timeout);
          // non-fatal — continue to next file
        }
      }
    };

    runScans().finally(() => {
      if (!cancelled) setOcrScanning(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFiles]);

  // ─── Handle server action result ─────────────────────────────────────────────
  useEffect(() => {
    if (!state || state === processedStateRef.current) return;
    processedStateRef.current = state;
    if (state?.success) {
      toast.success(isEdit ? "Transaction updated." : "Transaction added.");
      onOpenChange(false);
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  // ─── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (attachmentsToDelete.length > 0) {
      fd.set("deleteIds", JSON.stringify(attachmentsToDelete));
    }

    if (pendingFiles.length > 0) {
      setUploading(true);
      try {
        const uploaded: Array<{ url: string; name: string; sizeKb: number }> = [];
        for (const file of pendingFiles) {
          const uploadFd = new FormData();
          uploadFd.set("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: uploadFd });
          if (!res.ok) {
            const { error } = await res.json().catch(() => ({ error: "Upload failed." }));
            toast.error(error ?? "Upload failed.");
            setUploading(false);
            return;
          }
          const data = await res.json();
          uploaded.push({ url: data.url, name: data.filename, sizeKb: data.sizeKb });
        }
        fd.set("attachmentsJson", JSON.stringify(uploaded));
      } catch {
        toast.error("Upload failed. Please try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    // if neither deleteIds nor attachmentsJson: server leaves attachments untouched

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
      {/*
        The base SheetContent has data-[side=right]:sm:max-w-sm which has higher CSS specificity
        than sm:max-w-[…]. Matching the same variant prefix lets tailwind-merge deduplicate correctly.
      */}
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-[740px] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">
            {isEdit ? "Edit Transaction" : "Add Transaction"}
          </SheetTitle>
        </SheetHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="mt-5 px-4 pb-6">
          {isEdit && <input type="hidden" name="id" value={transaction.id} />}

          {/* OCR banners */}
          {ocrScanning && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-sm text-blue-700 mb-5">
              <Loader2 className="size-4 animate-spin shrink-0" />
              Scanning receipt{pendingFiles.length > 1 ? "s" : ""} — fields will be filled automatically…
            </div>
          )}
          {!ocrScanning && hasOcrFields && ocrResult.confidence >= 0.7 && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700 mb-5">
              <CheckCircle2 className="size-4 shrink-0" />
              Auto-filled from receipt — please confirm the values below
            </div>
          )}
          {!ocrScanning && hasOcrFields && ocrResult.confidence < 0.7 && (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2.5 text-sm text-yellow-700 mb-5">
              <AlertTriangle className="size-4 shrink-0" />
              Low confidence scan — please review and fill in manually
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] items-start gap-x-6 gap-y-5">

            {/* ── Left: form fields ── */}
            <div className="space-y-5">

              {/* Date + Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Date *</Label>
                  <input type="hidden" name="date" value={date} />
                  <DatePickerInput
                    value={date}
                    onChange={(v) => { setDate(v); removeFromOcrFields("date"); }}
                    placeholder="Pick a date"
                    scanning={ocrScanning}
                    disabled={isBusy}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-sm font-semibold">
                    Amount *
                    {ocrScanning && <Loader2 className="inline ml-1 size-3 animate-spin text-muted-foreground" />}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">$</span>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); removeFromOcrFields("amount"); }}
                      onBlur={() => { const n = parseFloat(amount); if (!isNaN(n)) setAmount(n.toFixed(2)); }}
                      placeholder="0.00"
                      className="h-11 pl-7"
                    />
                  </div>
                </div>
              </div>

              {/* Money in / Money out — card-style radio buttons */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Type</Label>
                <input type="hidden" name="type" value={txType} />
                <div className="grid grid-cols-2 gap-3">
                  {(["income", "expense"] as const).map((val) => (
                    <label
                      key={val}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition-all select-none",
                        txType === val
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-input hover:border-muted-foreground/40 hover:bg-muted/30 text-foreground"
                      )}
                    >
                      <input
                        type="radio"
                        name="_type_radio"
                        value={val}
                        checked={txType === val}
                        onChange={() => setTxType(val)}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          "size-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                          txType === val ? "border-indigo-600" : "border-muted-foreground/40"
                        )}
                      >
                        {txType === val && <div className="size-2 rounded-full bg-indigo-600" />}
                      </div>
                      <span className="text-sm font-semibold">
                        {val === "income" ? "Money in" : "Money out"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payee */}
              <div className="space-y-1.5">
                <Label htmlFor="payee" className="text-sm font-semibold">
                  Payee
                  {ocrScanning && <Loader2 className="inline ml-1 size-3 animate-spin text-muted-foreground" />}
                </Label>
                <Input
                  id="payee"
                  name="payee"
                  value={payee}
                  onChange={(e) => { setPayee(e.target.value); removeFromOcrFields("payee"); }}
                  placeholder="e.g. Home Depot"
                  className="h-11"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  Category
                  {ocrScanning && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                </Label>
                <CategoryPicker
                  key={transaction?.id ?? "new"}
                  category={category}
                  subcategory={subcategory}
                  onCategoryChange={(cat) => {
                    setCategory(cat);
                    setSubcategory("");
                    removeFromOcrFields("category");
                  }}
                  onSubcategoryChange={(sub) => {
                    setSubcategory(sub);
                    removeFromOcrFields("category");
                  }}
                />
              </div>

              {/* Property + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Property</Label>
                  <input type="hidden" name="propertyId" value={propertyId === "none" ? "" : propertyId} />
                  <Select
                    value={propertyId}
                    onValueChange={(v) => { setPropertyId(v ?? "none"); setUnitId("none"); }}
                  >
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="No property" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No property</SelectItem>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Unit</Label>
                  <input type="hidden" name="unitId" value={unitId === "none" ? "" : unitId} />
                  <Select
                    value={unitId}
                    onValueChange={(v) => setUnitId(v ?? "none")}
                  >
                    <SelectTrigger
                      className="w-full h-11"
                      disabled={propertyId === "none" || filteredUnits.length === 0}
                    >
                      <SelectValue
                        placeholder={propertyId === "none" ? "Select property first" : "No units"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No unit</SelectItem>
                      {filteredUnits.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={transaction?.notes ?? ""}
                  placeholder="Optional notes"
                  rows={3}
                />
              </div>

            </div>

            {/* ── Right: receipts ── */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                {(transaction?.attachments.length ?? 0) - attachmentsToDelete.length + pendingFiles.length > 1 ? "Receipts" : "Receipt"}
              </Label>
              <ReceiptUploadZone
                files={pendingFiles}
                scanning={ocrScanning}
                existingAttachments={
                  (transaction?.attachments ?? []).filter((a) => !attachmentsToDelete.includes(a.id))
                }
                onRemoveExisting={(id) => {
                  setAttachmentsToDelete((prev) => [...prev, id]);
                  ocrScannedRef.current = new WeakSet();
                }}
                onFilesChange={(files) => {
                  setPendingFiles(files);
                  if (files.length === 0) {
                    setOcrResult(null);
                    clearOcrFilledFields();
                  }
                }}
              />
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-6">
            <Button
              type="submit"
              disabled={isBusy || ocrScanning}
              className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm disabled:opacity-50"
            >
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
            <Button
              type="button"
              variant="outline"
              className="h-11 px-6 font-medium"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
