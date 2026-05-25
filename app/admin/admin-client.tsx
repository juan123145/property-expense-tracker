"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2, Shield, Users, Building2, Receipt, HardDrive, AlertTriangle } from "lucide-react";
import { adminDeleteUser } from "./actions";
import { cn } from "@/lib/utils";

type UserRow = {
  userId: string;
  propertyCount: number;
  transactionCount: number;
  storageKb: number;
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Users", value: totalUsers, icon: Users },
          { label: "Properties", value: totalProps, icon: Building2 },
          { label: "Transactions", value: totalTx, icon: Receipt },
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
            {rows.map((row) => (
              <div key={row.userId} className={cn("flex items-center gap-4 px-4 py-3", row.userId === currentUserId && "bg-primary/5")}>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs font-mono text-muted-foreground truncate">{truncateId(row.userId)}</p>
                  {row.userId === currentUserId && <span className="text-[10px] font-semibold text-primary">YOU</span>}
                </div>
                <div className="flex gap-4 text-sm shrink-0">
                  <span className="text-muted-foreground text-xs">{row.propertyCount} props</span>
                  <span className="text-muted-foreground text-xs">{row.transactionCount} txs</span>
                  <span className="text-muted-foreground text-xs">{fmtBytes(row.storageKb)}</span>
                </div>
                {row.userId !== currentUserId && (
                  confirmId === row.userId ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-destructive font-medium">Delete all data?</span>
                      <button
                        onClick={() => handleDelete(row.userId)}
                        disabled={deleting}
                        className="flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-xs font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                      >
                        {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                        Confirm
                      </button>
                      <button onClick={() => setConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
