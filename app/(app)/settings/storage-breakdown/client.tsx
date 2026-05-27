"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatBytes } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Image as ImageIcon, HardDrive, Eye, Trash2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { deleteTransactionAttachment } from "@/app/actions/transactions";

interface Transaction {
  id: string;
  date: string;
  payee: string | null;
  amount: string;
  type: string;
}

interface Attachment {
  id: string;
  attachmentUrl: string;
  fileName: string;
  sizeBytes: number | null;
  contentType: string | null;
  propertyId: string | null;
  createdAt: Date | null;
  transaction?: Transaction | null;
}

interface StorageBreakdownClientProps {
  attachments: Attachment[];
  byType: Record<string, { count: number; totalBytes: number }>;
  usedKb: number;
  quotaKb: number;
}

const typeIcons: Record<string, React.ComponentType<any>> = {
  "application/pdf": FileText,
  "image/jpeg": ImageIcon,
  "image/png": ImageIcon,
  "image/webp": ImageIcon,
};

const typeLabels: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG Image",
  "image/png": "PNG Image",
  "image/webp": "WebP Image",
};

function AttachmentPreview({ url, contentType }: { url: string; contentType: string | null }) {
  const [showPreview, setShowPreview] = useState(false);

  if (showPreview) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-card rounded-lg border shadow-xl w-full max-w-2xl max-h-[80vh] overflow-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Preview</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="bg-muted rounded-lg p-4 flex items-center justify-center min-h-[300px]">
            {contentType?.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="Preview" className="max-w-full max-h-[60vh] rounded" />
            ) : contentType === "application/pdf" ? (
              <iframe src={url} className="w-full h-[60vh] rounded" />
            ) : (
              <p className="text-muted-foreground text-sm">Preview not available for this file type</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs gap-1"
      onClick={() => setShowPreview(true)}
    >
      <Eye className="size-3" />
      Preview
    </Button>
  );
}

function DeleteAttachmentButton({ attachmentId }: { attachmentId: string }) {
  const [pending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteTransactionAttachment(attachmentId);
        toast.success("Attachment deleted permanently.");
        setShowConfirm(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        toast.error(message);
      }
    });
  }

  if (showConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-card rounded-lg border shadow-xl w-full max-w-sm p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
              <AlertTriangle className="size-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Delete this attachment?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                This will permanently delete this file from your account. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowConfirm(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirm}
              disabled={pending}
            >
              <Trash2 className="size-3 mr-1" />
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
      onClick={() => setShowConfirm(true)}
      disabled={pending}
    >
      <Trash2 className="size-3" />
      Delete
    </Button>
  );
}

export function StorageBreakdownClient({
  attachments,
  byType,
  usedKb,
  quotaKb,
}: StorageBreakdownClientProps) {
  const percentUsed = (usedKb / quotaKb) * 100;
  const remainingKb = quotaKb - usedKb;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Storage Breakdown</h1>
      </div>

      {/* Overall Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>
            Only attachment file sizes count toward your quota (transaction database entries do not)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{formatBytes(usedKb * 1024)} used</span>
              <span>{formatBytes(quotaKb * 1024)} total</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  percentUsed > 90
                    ? "bg-red-500"
                    : percentUsed > 70
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              {percentUsed.toFixed(1)}% used • {formatBytes(remainingKb * 1024)} remaining
            </p>
          </div>
        </CardContent>
      </Card>

      {/* By Type */}
      <Card>
        <CardHeader>
          <CardTitle>Storage by File Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(byType).map(([type, { count, totalBytes }]) => {
              const Icon = typeIcons[type] || HardDrive;
              const label = typeLabels[type] || type;
              const percentage = (totalBytes / (usedKb * 1024)) * 100;

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{label}</span>
                      <span className="text-sm text-gray-500">({count} files)</span>
                    </div>
                    <span className="text-sm font-medium">{formatBytes(totalBytes)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      <Card>
        <CardHeader>
          <CardTitle>All Attachments</CardTitle>
          <CardDescription>
            Showing {attachments.length} file{attachments.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {attachments.length === 0 ? (
              <p className="text-sm text-gray-500">No attachments</p>
            ) : (
              attachments.map((a) => (
                <div key={a.id} className="border rounded-lg p-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">{a.fileName.split("/").pop()}</p>
                      <p className="text-xs text-gray-500">
                        {a.contentType || "unknown"} • {a.createdAt?.toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-600 flex-shrink-0">
                      {formatBytes(a.sizeBytes ?? 0)}
                    </span>
                  </div>

                  {/* Transaction Details */}
                  {a.transaction ? (
                    <div className="bg-blue-50 border border-blue-100 rounded p-2 mb-2 text-xs">
                      <p className="font-medium text-blue-900">Attached to transaction:</p>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-blue-800">
                        <div>
                          <span className="text-blue-600">Date:</span> {a.transaction.date}
                        </div>
                        <div>
                          <span className="text-blue-600">Payee:</span> {a.transaction.payee || "—"}
                        </div>
                        <div>
                          <span className="text-blue-600">Amount:</span>{" "}
                          {a.transaction.type === "income" ? "+" : "-"}${parseFloat(a.transaction.amount).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic mb-2">No transaction associated</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <AttachmentPreview url={a.attachmentUrl} contentType={a.contentType} />
                    <DeleteAttachmentButton attachmentId={a.id} />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
