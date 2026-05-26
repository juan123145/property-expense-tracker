"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { User, HardDrive, Trash2, AlertTriangle, Shield, X, Monitor, Sun, Moon, LogOut, Edit2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteAccount, updateUserProfile } from "./actions";

type Props = {
  user: { name: string | null; email: string | null; image: string | null };
  username: string | null;
  phone: string | null;
  usedKb: number;
  quotaKb: number;
};

function fmtBytes(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1024 / 1024).toFixed(2)} GB`;
}

export function SettingsClient({ user, username, phone, usedKb, quotaKb }: Props) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState(username ?? "");
  const [editPhone, setEditPhone] = useState(phone ?? "");
  const [editName, setEditName] = useState(user.name ?? "");
  const [isPending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  function handleUpdateProfile() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("username", editUsername);
      formData.set("name", editName);
      formData.set("phone", editPhone);

      const result = await updateUserProfile(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated!");
        setIsEditingProfile(false);
      }
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
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/30">
          <div className="flex items-center gap-2.5">
            <User className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Profile</h2>
          </div>
          {!isEditingProfile && (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 className="size-3" />
              Edit
            </button>
          )}
        </div>

        {isEditingProfile ? (
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="John Doe"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="john_doe"
                pattern="[a-zA-Z0-9_]+"
                minLength={3}
                maxLength={20}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">3-20 characters, letters/numbers/underscore only</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                type="tel"
                placeholder="+1 (555) 123-4567"
                disabled={isPending}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              <Shield className="size-3 inline mr-1" />
              Email is managed by Google. Visit{" "}
              <a
                href="https://myaccount.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                myaccount.google.com
              </a>
              {" "}to change it.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingProfile(false);
                  setEditUsername(username ?? "");
                  setEditPhone(phone ?? "");
                  setEditName(user.name ?? "");
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateProfile}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
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
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Username</p>
                  <p className="text-sm font-medium truncate">{username ? `@${username}` : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                  <p className="text-sm font-medium truncate">{phone ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sign out — shown on mobile where the sidebar button isn't visible */}
        <div className="md:hidden px-5 pb-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
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

          <Link href="/settings/storage-breakdown" className="inline-block">
            <button className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              View detailed breakdown
              <ChevronRight className="size-3" />
            </button>
          </Link>
        </div>
      </section>

      {/* Appearance */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-muted/30">
          <Sun className="size-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Appearance</h2>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground">Choose how the app looks. System follows your device preference.</p>
          <div className="flex gap-2">
            {([
              { value: "system", label: "System", Icon: Monitor },
              { value: "light",  label: "Light",  Icon: Sun    },
              { value: "dark",   label: "Dark",   Icon: Moon   },
            ] as const).map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors",
                  mounted && theme === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
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
