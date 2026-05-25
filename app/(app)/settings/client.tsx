"use client";

import { useState, useTransition } from "react";
import { User, HardDrive, Trash2, AlertTriangle, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteAccount } from "./actions";

type Props = {
  user: { name: string | null; email: string | null; image: string | null };
  usedKb: number;
  quotaKb: number;
};

function fmtBytes(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1024 / 1024).toFixed(2)} GB`;
}

export function SettingsClient({ user, usedKb, quotaKb }: Props) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const pct = Math.min(100, (usedKb / quotaKb) * 100);
  const isWarning = pct >= 80;
  const isCritical = pct >= 95;

  const barColor = isCritical
    ? "bg-red-500"
    : isWarning
    ? "bg-amber-500"
    : "bg-primary";

  function handleDeleteAccount() {
    startTransition(async () => {
      await deleteAccount();
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account and data</p>
      </div>

      {/* Profile */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-muted/30">
          <User className="size-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Profile</h2>
        </div>
        <div className="p-5 flex items-start gap-5">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? ""}
              referrerPolicy="no-referrer"
              className="size-16 rounded-full shrink-0 ring-2 ring-border"
            />
          ) : (
            <div className="size-16 rounded-full shrink-0 bg-primary flex items-center justify-center ring-2 ring-border">
              <span className="text-primary-foreground text-xl font-bold">
                {(user.name ?? user.email ?? "?")[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="space-y-3.5 flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Name</p>
                <p className="text-sm font-medium truncate">{user.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm font-medium truncate">{user.email ?? "—"}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <Shield className="size-3.5 shrink-0" />
              Signed in with Google — to update your name or email, visit{" "}
              <a
                href="https://myaccount.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                myaccount.google.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Storage */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-muted/30">
          <HardDrive className="size-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Storage</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-bold tabular-nums">{fmtBytes(usedKb)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">of {fmtBytes(quotaKb)} used</p>
            </div>
            <p className={cn("text-sm font-semibold tabular-nums", isWarning ? "text-amber-600" : isCritical ? "text-red-600" : "text-muted-foreground")}>
              {pct.toFixed(1)}%
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0</span>
              <span>{fmtBytes(quotaKb)}</span>
            </div>
          </div>

          {isWarning && (
            <div className={cn(
              "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-xs",
              isCritical
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            )}>
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <p>
                {isCritical
                  ? "Storage is nearly full. Delete old receipts and attachments to free space."
                  : "Storage is at 80% capacity. Consider removing unused attachments."}
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Storage is used by receipts and attachments uploaded to transactions.
          </p>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-red-200 bg-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-red-200 bg-red-50/50">
          <AlertTriangle className="size-4 text-red-600" />
          <h2 className="font-semibold text-sm text-red-700">Danger Zone</h2>
        </div>
        <div className="p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-xs text-muted-foreground mt-1">
              Permanently deletes your account, all properties, transactions, and uploaded files. This cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </div>
      </section>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl border shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                  <AlertTriangle className="size-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Delete Account</h3>
                  <p className="text-xs text-muted-foreground">This action is permanent and irreversible</p>
                </div>
              </div>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 space-y-1.5">
              <p className="font-semibold">The following will be permanently deleted:</p>
              <ul className="space-y-0.5 list-disc list-inside text-red-600">
                <li>All properties and units</li>
                <li>All transactions and records</li>
                <li>All uploaded receipts and attachments</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs font-bold tracking-wider">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "DELETE" || isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="size-3.5" />
                {isPending ? "Deleting…" : "Delete My Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
