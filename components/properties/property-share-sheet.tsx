"use client";

import { useActionState, useState, useTransition } from "react";
import { Share2, Loader2, Mail, Trash2, Clock, CheckCircle2, Copy, Check, Link2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { shareProperty, revokeShare } from "@/app/actions/shares";
import { cn } from "@/lib/utils";

type ShareRow = {
  id: string;
  invitedEmail: string;
  permission: string;
  status: string;
};

type Props = {
  propertyId: string;
  propertyName: string;
  currentShares: ShareRow[];
};

const INITIAL_STATE = { error: undefined as string | undefined, success: false, inviteUrl: undefined as string | undefined };

export function PropertyShareSheet({ propertyId, propertyName, currentShares }: Props) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareRow[]>(currentShares);
  const [revoking, startRevoke] = useTransition();
  const [copied, setCopied] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: typeof INITIAL_STATE, formData: FormData) => {
      formData.set("propertyId", propertyId);
      const result = await shareProperty(prev, formData);
      if (result.success) {
        // Optimistically add the new pending share to local state
        const email = (formData.get("email") as string)?.toLowerCase().trim();
        const permission = formData.get("permission") as string;
        setShares((prev) => [
          ...prev.filter((s) => s.invitedEmail !== email),
          { id: crypto.randomUUID(), invitedEmail: email, permission, status: "pending" },
        ]);
      }
      return result as typeof INITIAL_STATE;
    },
    INITIAL_STATE
  );

  function handleRevoke(shareId: string) {
    startRevoke(async () => {
      await revokeShare(shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    });
  }

  const activeShares = shares.filter((s) => s.status !== "revoked");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="size-4" />
          Share
        </Button>
      } />
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="text-base">Share &ldquo;{propertyName}&rdquo;</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Invite form */}
          <div className="p-5 border-b space-y-4">
            <p className="text-sm text-muted-foreground">
              Invite someone to access this property by email.
            </p>
            <form action={formAction} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email address</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="colleague@example.com"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Permission</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "view", label: "View Only", desc: "Can see transactions, cannot add or edit" },
                    { value: "edit", label: "Can Edit", desc: "Can add, edit, and delete transactions" },
                  ].map(({ value, label, desc }) => (
                    <label key={value} className="relative cursor-pointer">
                      <input type="radio" name="permission" value={value} defaultChecked={value === "view"} className="sr-only peer" />
                      <div className="rounded-lg border p-3 text-xs peer-checked:border-primary peer-checked:bg-primary/5 transition-colors">
                        <p className="font-semibold peer-checked:text-primary">{label}</p>
                        <p className="text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {state.error && <p className="text-xs text-destructive">{state.error}</p>}
              {state.success && state.inviteUrl && (
                <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                    <Check className="size-3.5" /> Invite created — share this link:
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-xs text-muted-foreground truncate font-mono bg-background border rounded px-2 py-1">
                      {state.inviteUrl}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(state.inviteUrl!);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="shrink-0 p-1.5 rounded-md border hover:bg-accent transition-colors"
                      title="Copy link"
                    >
                      {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Link2 className="size-3" />
                    Send this link to {shares.at(-1)?.invitedEmail} so they can accept the invite.
                  </p>
                </div>
              )}
              <Button type="submit" disabled={pending} className="w-full gap-2">
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Send Invitation
              </Button>
            </form>
          </div>

          {/* Current shares */}
          {activeShares.length > 0 && (
            <div className="p-5 space-y-3">
              <h3 className="text-sm font-semibold">Current Access</h3>
              <div className="space-y-2">
                {activeShares.map((share) => (
                  <div key={share.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{share.invitedEmail}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {share.status === "accepted" ? (
                          <CheckCircle2 className="size-3 text-green-500 shrink-0" />
                        ) : (
                          <Clock className="size-3 text-amber-500 shrink-0" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {share.status === "accepted" ? "Accepted · " : "Pending · "}
                          {share.permission === "edit" ? "Can Edit" : "View Only"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(share.id)}
                      disabled={revoking}
                      className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      title="Revoke access"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
