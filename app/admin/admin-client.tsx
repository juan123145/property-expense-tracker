"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2, Shield, Users, Building2, Receipt, HardDrive, AlertTriangle, ChevronDown, Download, Search, ArrowUpDown, ChevronLeft, X, FileX } from "lucide-react";
import Link from "next/link";
import { adminDeleteUser, adminDeleteAttachment } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FileRow = {
  id: string;
  userId: string;
  fileName: string | null;
  sizeKb: number | null;
  url: string;
  txDate: Date;
  txPayee: string | null;
  txAmount: string;
};

type UserRow = {
  userId: string;
  email: string | null;
  name: string | null;
  image: string | null;
  propertyCount: number;
  transactionCount: number;
  fileCount: number;
  storageKb: number;
  files: FileRow[];
};

type Props = {
  users: UserRow[];
  currentUserId?: string;
};

function fmtBytes(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1024 / 1024).toFixed(2)} GB`;
}

function truncateId(id: string): string {
  return id.length > 20 ? `${id.slice(0, 10)}…${id.slice(-8)}` : id;
}

function isPreviewable(fileName: string | null): boolean {
  if (!fileName) return false;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const previewableExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
  return previewableExts.includes(ext);
}

export function AdminClient({ users, currentUserId }: Props) {
  const [rows, setRows] = useState(users);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [fileViewerId, setFileViewerId] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState("");
  const [fileSort, setFileSort] = useState<"size" | "date" | "name">("size");
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [userFiles, setUserFiles] = useState<Record<string, FileRow[]>>({});
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null);
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<FileRow | null>(null);
  const [deleting, startDelete] = useTransition();
  const [deletingAttachment, startDeleteAttachment] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(userId: string) {
    setError(null);
    startDelete(async () => {
      const result = await adminDeleteUser(userId);
      if (result?.error) {
        setError(result.error);
      } else {
        setRows((prev) => prev.filter((r) => r.userId !== userId));
      }
      setConfirmId(null);
    });
  }

  function handleDeleteFile(file: FileRow) {
    setDeleteConfirmFile(file);
  }

  function confirmDeleteFile(file: FileRow) {
    setError(null);
    startDeleteAttachment(async () => {
      const result = await adminDeleteAttachment(file.id);
      if (result?.error) {
        setError(result.error);
      } else {
        setUserFiles((prev) => ({
          ...prev,
          [file.userId]: (prev[file.userId] || []).filter((f) => f.id !== file.id),
        }));
        setRows((prev) =>
          prev.map((r) =>
            r.userId === file.userId
              ? { ...r, files: r.files.filter((f) => f.id !== file.id), fileCount: r.fileCount - 1, storageKb: r.storageKb - (file.sizeKb ?? 0) }
              : r
          )
        );
      }
      setDeleteConfirmFile(null);
      setPreviewFile(null);
    });
  }

  const totalUsers = rows.length;
  const totalProps = rows.reduce((s, r) => s + r.propertyCount, 0);
  const totalTx = rows.reduce((s, r) => s + r.transactionCount, 0);
  const totalFiles = rows.reduce((s, r) => s + r.fileCount, 0);
  const totalStorage = rows.reduce((s, r) => s + r.storageKb, 0);

  const openFileViewer = (userId: string) => {
    setFileViewerId(userId);
    setFileSearch("");
    setFileSort("size");
    if (!userFiles[userId]) {
      setUserFiles((prev) => ({ ...prev, [userId]: rows.find((r) => r.userId === userId)?.files || [] }));
    }
  };

  const filesForViewer = userFiles[fileViewerId || ""] || [];
  const filteredFiles = filesForViewer.filter((f) =>
    f.fileName?.toLowerCase().includes(fileSearch.toLowerCase())
  );
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (fileSort === "size") return (b.sizeKb ?? 0) - (a.sizeKb ?? 0);
    if (fileSort === "date") return new Date(b.txDate).getTime() - new Date(a.txDate).getTime();
    return (a.fileName || "").localeCompare(b.fileName || "");
  });

  const viewerUser = rows.find((r) => r.userId === fileViewerId);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft className="size-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Center</h1>
          <p className="text-sm text-muted-foreground">Internal tool · {totalUsers} users across the platform</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Users", value: totalUsers, icon: Users },
          { label: "Properties", value: totalProps, icon: Building2 },
          { label: "Transactions", value: totalTx, icon: Receipt },
          { label: "Files", value: totalFiles, icon: HardDrive },
          { label: "Storage", value: fmtBytes(totalStorage), icon: HardDrive },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-card p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Icon className="size-3" />
              <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* User table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/50">
          <h2 className="text-sm font-semibold">All Users ({rows.length})</h2>
        </div>
        {rows.length === 0 ? (
          <p className="p-8 text-sm text-center text-muted-foreground">No users with properties found.</p>
        ) : (
          <div className="divide-y">
            {rows.map((row) => {
              const profile = row.name || row.email ? `${row.name || ""} ${row.email ? `(${row.email})` : ""}`.trim() : null;
              const storagePercent = totalStorage > 0 ? Math.round((row.storageKb / totalStorage) * 100) : 0;

              return (
                <div
                  key={row.userId}
                  className={cn("flex items-center gap-4 px-6 py-4", row.userId === currentUserId && "bg-primary/5")}
                >
                  {/* Avatar + name/email */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="size-10 rounded-full shrink-0 bg-primary/20 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                      {row.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.image} alt={row.name ?? ""} className="size-10 rounded-full" />
                      ) : (
                        (row.name?.[0] || row.email?.[0] || "?").toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {profile ? (
                        <>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{row.name || row.email}</p>
                            {row.userId === currentUserId && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">YOU</span>}
                          </div>
                          {row.email && row.name && <p className="text-xs text-muted-foreground truncate">{row.email}</p>}
                        </>
                      ) : (
                        <p className="text-xs font-mono text-muted-foreground truncate">{truncateId(row.userId)}</p>
                      )}
                    </div>
                  </div>

                  {/* Props badge */}
                  <div className="flex items-center px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-foreground shrink-0">
                    <Building2 className="size-3 mr-1" />
                    {row.propertyCount}
                  </div>

                  {/* Transactions badge */}
                  <div className="flex items-center px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-foreground shrink-0">
                    <Receipt className="size-3 mr-1" />
                    {row.transactionCount}
                  </div>

                  {/* Files button */}
                  {row.fileCount > 0 && (
                    <button
                      onClick={() => openFileViewer(row.userId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-xs font-medium text-primary hover:bg-primary/20 transition-colors shrink-0"
                    >
                      {row.fileCount} files
                      <ChevronDown className="size-3" />
                    </button>
                  )}
                  {row.fileCount === 0 && (
                    <span className="text-xs text-muted-foreground shrink-0">No files</span>
                  )}

                  {/* Storage bar */}
                  <div className="hidden lg:flex items-center gap-2 shrink-0">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-colors",
                          storagePercent < 50 ? "bg-green-500" : storagePercent < 80 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${Math.max(storagePercent, 5)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium w-12 text-right">{fmtBytes(row.storageKb)}</span>
                  </div>

                  {/* Delete button */}
                  {row.userId !== currentUserId && (
                    confirmId === row.userId ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-destructive font-medium">Delete?</span>
                        <button
                          onClick={() => handleDelete(row.userId)}
                          disabled={deleting}
                          className="flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1.5 text-xs font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                        >
                          {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(row.userId)}
                        className="shrink-0 p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete user account"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* File viewer drawer */}
      <Sheet open={!!fileViewerId} onOpenChange={(open) => !open && setFileViewerId(null)}>
        <SheetContent side="right" className="w-full sm:w-96 flex flex-col">
          <SheetHeader>
            <SheetTitle>
              Files{viewerUser && ` · ${viewerUser.name || viewerUser.email || "User"}`}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Sort toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setFileSort(fileSort === "size" ? "date" : "size")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                <ArrowUpDown className="size-3" />
                Sort by {fileSort === "size" ? "size" : fileSort === "date" ? "date" : "name"}
              </button>
            </div>

            {/* Files list */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {sortedFiles.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-6">
                  {fileSearch ? "No files match your search." : "No files uploaded yet."}
                </p>
              ) : (
                sortedFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setPreviewFile(file)}
                    className="w-full flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors group text-left cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate hover:underline" title={file.fileName ?? "unnamed"}>
                        {file.fileName || "unnamed"}
                      </p>
                      <div className="flex gap-2 text-[11px] text-muted-foreground mt-1">
                        <span>{fmtBytes(file.sizeKb ?? 0)}</span>
                        <span>•</span>
                        <span>{new Date(file.txDate).toLocaleDateString()}</span>
                        {file.txPayee && (
                          <>
                            <span>•</span>
                            <span className="truncate">{file.txPayee}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 invisible group-hover:visible transition-all" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                        title="Download"
                      >
                        <Download className="size-4" />
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFile(file); }}
                        disabled={deletingAttachmentId === file.id || deletingAttachment}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingAttachmentId === file.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* File preview modal */}
      <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) setPreviewFile(null); }}>
        <DialogContent className="!max-w-7xl max-h-[95vh] w-[95vw] flex flex-col p-0 gap-0 border">
          <DialogHeader className="border-b px-6 py-4 shrink-0">
            <DialogTitle className="text-base">
              {previewFile?.fileName || "File"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal mt-1">
              {previewFile && `${fmtBytes(previewFile.sizeKb ?? 0)} • ${new Date(previewFile.txDate).toLocaleDateString()}`}
            </p>
          </DialogHeader>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20 p-4 rounded-none">
            {previewFile && isPreviewable(previewFile.fileName) ? (
              previewFile.fileName?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewFile.url}
                  className="w-full h-full rounded-md border shadow-lg"
                  title="PDF Preview"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFile.url}
                  alt={previewFile.fileName ?? "File preview"}
                  className="max-w-full max-h-full object-contain rounded-md shadow-lg"
                />
              )
            ) : previewFile ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center justify-center w-20 h-20 rounded-lg bg-muted">
                  <FileX className="size-10 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-muted-foreground">File not compatible for preview</p>
                <p className="text-sm text-muted-foreground max-w-sm text-center">
                  This file type cannot be opened in the browser. Click the download button below to save it.
                </p>
              </div>
            ) : null}
          </div>

          {/* Footer with actions */}
          {previewFile && (
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t shrink-0 bg-muted/30">
              <a
                href={previewFile.url}
                download={previewFile.fileName ?? "file"}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              >
                <Download className="size-4" />
                Download
              </a>
              <button
                onClick={() => handleDeleteFile(previewFile)}
                disabled={deletingAttachmentId === previewFile.id || deletingAttachment}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {deletingAttachmentId === previewFile.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal */}
      {deleteConfirmFile && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <Trash2 className="size-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Delete File</h3>
                <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone</p>
              </div>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              <p className="font-mono truncate">{deleteConfirmFile.fileName}</p>
              <p className="text-xs mt-1">{fmtBytes(deleteConfirmFile.sizeKb ?? 0)}</p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setDeleteConfirmFile(null)}
                disabled={deletingAttachmentId === deleteConfirmFile.id || deletingAttachment}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteFile(deleteConfirmFile)}
                disabled={deletingAttachmentId === deleteConfirmFile.id || deletingAttachment}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {deletingAttachmentId === deleteConfirmFile.id ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    Delete File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
