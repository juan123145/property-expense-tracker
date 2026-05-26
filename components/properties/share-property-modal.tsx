"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { shareProperty } from "@/app/actions/shares";
import {
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Shield,
  User,
} from "lucide-react";
import { format, addDays } from "date-fns";

type Props = {
  propertyId: string;
  propertyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

type FormState = "form" | "loading" | "success" | "error";

export function SharePropertyModal({
  propertyId,
  propertyName,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [state, setState] = useState<FormState>("form");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("VIEWER");
  const [canShare, setCanShare] = useState(false);
  const [useExpiration, setUseExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(30);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setState("loading");

    try {
      const formData = new FormData();
      formData.set("propertyId", propertyId);
      formData.set("email", email);
      formData.set("role", role);
      formData.set("canShare", canShare ? "true" : "false");

      const result = await shareProperty({} as any, formData);

      if (result.error) {
        setError(result.error);
        setState("error");
        return;
      }

      setInviteUrl(result.inviteUrl || "");
      setState("success");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
      setState("error");
    }
  };

  const handleClose = () => {
    if (state === "success" || state === "error") {
      setEmail("");
      setRole("VIEWER");
      setCanShare(false);
      setUseExpiration(false);
      setExpirationDays(30);
      setError("");
      setInviteUrl("");
      setState("form");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share &quot;{propertyName}&quot;</DialogTitle>
          <DialogDescription>
            Invite someone to collaborate on this property
          </DialogDescription>
        </DialogHeader>

        {state === "form" && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Access level</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: "VIEWER",
                    label: "Viewer",
                    description: "Can view only",
                  },
                  {
                    value: "EDITOR",
                    label: "Editor",
                    description: "Can edit & add",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value as "EDITOR" | "VIEWER")}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      role === option.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Can Share Toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={canShare}
                onChange={(e) => setCanShare(e.target.checked)}
                className="rounded border"
              />
              <span className="text-sm">Allow them to share with others</span>
            </label>

            {/* Temporary Access */}
            <label className="flex items-center gap-2.5 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={useExpiration}
                onChange={(e) => setUseExpiration(e.target.checked)}
                className="rounded border"
              />
              <span className="text-sm">Temporary access</span>
            </label>

            {useExpiration && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="size-4" />
                  Access expires in
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "24h", days: 1 },
                    { label: "7d", days: 7 },
                    { label: "30d", days: 30 },
                  ].map(({ label, days }) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExpirationDays(days)}
                      className={`rounded border p-2 text-xs font-medium transition-colors ${
                        expirationDays === days
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-background"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Expires {format(addDays(new Date(), expirationDays), "MMM d, yyyy")}
                </p>
              </div>
            )}

            {/* Invite Summary */}
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">INVITE SUMMARY</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{email || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role:</span>
                  <Badge variant="secondary">{role}</Badge>
                </div>
                {canShare && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Can share:</span>
                    <Badge variant="outline">Yes</Badge>
                  </div>
                )}
                {useExpiration && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expires:</span>
                    <Badge variant="outline">
                      {format(addDays(new Date(), expirationDays), "MMM d")}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex gap-2">
                <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2">
                <Mail className="size-4" />
                Send Invitation
              </Button>
            </div>
          </form>
        )}

        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Sending invitation...</p>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <CheckCircle2 className="size-12 text-green-600" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">Invitation sent!</p>
              <p className="text-sm text-muted-foreground">
                {email} has been invited with {role.toLowerCase()} access
              </p>
            </div>

            {inviteUrl && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">INVITE LINK</p>
                <p className="text-xs text-muted-foreground break-all font-mono">
                  {inviteUrl}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                  }}
                >
                  Copy Link
                </Button>
              </div>
            )}

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <AlertCircle className="size-12 text-destructive" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">Failed to send invitation</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button
              onClick={() => setState("form")}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
