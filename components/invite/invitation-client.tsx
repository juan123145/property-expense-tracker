"use client";

import { useState } from "react";
import { acceptInvite, declineInvite } from "@/app/actions/shares";
import { Building2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface InvitationClientProps {
  token: string;
  propertyName: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  expiresAt: Date;
  invitedEmail: string;
  userEmail: string | null | undefined;
}

export function InvitationClient({
  token,
  propertyName,
  role,
  expiresAt,
  invitedEmail,
  userEmail,
}: InvitationClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await acceptInvite(token);
      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push(`/properties/${result.propertyId}`);
      }
    } catch (err) {
      setError("Failed to accept invitation. Please try again.");
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await declineInvite(token);
      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Failed to decline invitation. Please try again.");
      setLoading(false);
    }
  };

  const emailMatch = userEmail?.toLowerCase() === invitedEmail.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm rounded-2xl border bg-card shadow-lg p-8 text-center space-y-6">
        <div className="flex justify-center">
          <Building2 className="size-14 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Invitation to Collaborate</h1>
          <p className="text-sm text-muted-foreground">
            You've been invited to join <strong>{propertyName}</strong>
          </p>
        </div>

        <div className="bg-muted rounded-lg p-4 space-y-2 text-left text-sm">
          <div>
            <span className="text-muted-foreground">Invited Email:</span>
            <p className="font-medium">{invitedEmail}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Your Email:</span>
            <p className="font-medium">{userEmail || "Not logged in"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Access Level:</span>
            <p className="font-medium">
              {role === "OWNER" ? "Owner" : role === "EDITOR" ? "Can Edit" : "View Only"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Expires:</span>
            <p className="font-medium">{new Date(expiresAt).toLocaleDateString()}</p>
          </div>
        </div>

        {!emailMatch && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            ⚠️ This invitation was sent to <strong>{invitedEmail}</strong>, but you're logged in as{" "}
            <strong>{userEmail}</strong>. Please log in with the correct email address to accept.
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-3 text-sm text-destructive">
            ❌ {error}
          </div>
        )}

        {!emailMatch ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Need to switch accounts?{" "}
              <Link href="/api/auth/signout" className="text-primary hover:underline font-medium">
                Sign out
              </Link>
            </p>
            <Link
              href="/dashboard"
              className="block w-full mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleDecline}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="size-4" />
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="size-4" />
              {loading ? "Accepting..." : "Accept"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
