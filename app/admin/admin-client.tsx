"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2, Shield, Users, Building2, Receipt, HardDrive, AlertTriangle, ChevronDown } from "lucide-react";
import { adminDeleteUser } from "./actions";
import { cn } from "@/lib/utils";

type FileRow = {
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

export function AdminClient({ users, currentUserId }: Props) {
  const [rows, setRows] = useState(users);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
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

  const totalUsers = rows.length;
  const totalProps = rows.reduce((s, r) => s + r.propertyCount, 0);
  const totalTx = rows.reduce((s, r) => s + r.transactionCount, 0);
  const totalFiles = rows.reduce((s, r) => s + r.fileCount, 0);
  const totalStorage = rows.reduce((s, r) => s + r.storageKb, 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Shield className="size-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Admin Center</h1>
          <p className="text-xs text-muted-foreground">Internal tool — not visible to regular users</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Users", value: totalUsers, icon: Users },
          { label: "Properties", value: totalProps, icon: Building2 },
          { label: "Transactions", value: totalTx, icon: Receipt },
          { label: "Files", value: totalFiles, icon: HardDrive },
          { label: "Storage", value: fmtBytes(totalStorage), icon: HardDrive },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Icon className="size-3.5" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* User table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-semibold">All Users ({rows.length})</h2>
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-center text-muted-foreground">No users with properties found.</p>
        ) : (
          <div className="divide-y">
            {rows.map((row) => {
              const isExpanded = expandedId === row.userId;
              const profile = row.name || row.email ? `${row.name || ""} ${row.email ? `(${row.email})` : ""}`.trim() : null;
              const largestFile = row.files[0];

              return (
                <div key={row.userId}>
                  <div className={cn("flex items-center gap-3 px-4 py-3", row.userId === currentUserId && "bg-primary/5")}>
                    {/* Avatar + name/email */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="size-9 rounded-full shrink-0 bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {row.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.image} alt={row.name ?? ""} className="size-9 rounded-full" />
                        ) : (
                          (row.name?.[0] || row.email?.[0] || "?").toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {profile ? (
                          <>
                            <p className="text-sm font-medium truncate">{row.name || row.email}</p>
                            {row.email && row.name && <p className="text-xs text-muted-foreground truncate">{row.email}</p>}
                          </>
                        ) : (
                          <p className="text-xs font-mono text-muted-foreground truncate">{truncateId(row.userId)}</p>
                        )}
                        {row.userId === currentUserId && <span className="text-[10px] font-semibold text-primary">YOU</span>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 text-xs shrink-0 text-muted-foreground">
                      <span>{row.propertyCount} props</span>
                      <span>{row.transactionCount} txs</span>
                      <span>{row.fileCount} files</span>
                      <span>{fmtBytes(row.storageKb)}</span>
                    </div>

                    {/* Largest file chip */}
                    {largestFile && (
                      <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 text-[11px] shrink-0">
                        <span>Largest: {largestFile.fileName ? largestFile.fileName.slice(0, 20) : "file"}{(largestFile.fileName?.length ?? 0) > 20 ? "…" : ""}</span>
                      </div>
                    )}

                    {/* Expand button */}
                    {row.fileCount > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : row.userId)}
                        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <ChevronDown className={cn("size-4 transition-transform", isExpanded && "rotate-180")} />
                      </button>
                    )}

                    {/* Delete button */}
                    {row.userId !== currentUserId && (
                      confirmId === row.userId ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-destructive font-medium">Delete?</span>
                          <button
                            onClick={() => handleDelete(row.userId)}
                            disabled={deleting}
                            className="flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-xs font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                          >
                            {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                          </button>
                          <button onClick={() => setConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground">No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(row.userId)}
                          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete user account"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )
                    )}
                  </div>

                  {/* Expanded file list */}
                  {isExpanded && row.files.length > 0 && (
                    <div className="border-t bg-muted/30 px-4 py-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs font-medium text-muted-foreground border-b">
                            <th className="text-left py-2">File</th>
                            <th className="text-right py-2">Size</th>
                            <th className="text-left py-2">Date</th>
                            <th className="text-left py-2">Payee</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.files.map((file, idx) => (
                            <tr key={idx} className="border-t text-xs">
                              <td className="py-2 truncate">{file.fileName || "unnamed"}</td>
                              <td className="text-right py-2">{fmtBytes(file.sizeKb ?? 0)}</td>
                              <td className="py-2 text-muted-foreground">{new Date(file.txDate).toLocaleDateString()}</td>
                              <td className="py-2 text-muted-foreground truncate">{file.txPayee || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
