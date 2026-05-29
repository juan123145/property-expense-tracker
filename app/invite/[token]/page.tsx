import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { propertyInvitations, properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Building2, CheckCircle2, XCircle, Check, X } from "lucide-react";
import Link from "next/link";
import { InvitationClient } from "@/components/invite/invitation-client";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const user = await requireAuth();

  // Look up the invite
  const [invitation] = await db
    .select({
      id: propertyInvitations.id,
      status: propertyInvitations.status,
      role: propertyInvitations.role,
      invitedEmail: propertyInvitations.invitedEmail,
      propertyId: propertyInvitations.propertyId,
      propertyName: properties.name,
      expiresAt: propertyInvitations.expiresAt,
    })
    .from(propertyInvitations)
    .innerJoin(properties, eq(propertyInvitations.propertyId, properties.id))
    .where(eq(propertyInvitations.token, token))
    .limit(1);

  if (!invitation) {
    console.error("❌ Invitation not found for token:", token);
    return <InviteResult icon="error" title="Invitation not found" message="This link is invalid or has expired. Check browser console for details." />;
  }

  // Check if expired
  if (invitation.status === "EXPIRED") {
    console.warn("⏰ Invitation expired:", token);
    return <InviteResult icon="error" title="Invitation expired" message="This invitation has expired. Please ask the property owner to send you a new one." />;
  }

  if (invitation.status === "ACCEPTED") {
    redirect(`/properties/${invitation.propertyId}`);
  }

  if (invitation.status === "DECLINED") {
    console.warn("❌ Invitation was declined:", token);
    return <InviteResult icon="error" title="Invitation declined" message="You previously declined this invitation." />;
  }

  if (invitation.status === "CANCELED") {
    console.warn("❌ Invitation was canceled:", token);
    return <InviteResult icon="error" title="Invitation canceled" message="This invitation has been canceled by the property owner." />;
  }

  return (
    <InvitationClient
      token={token}
      propertyName={invitation.propertyName}
      role={invitation.role}
      expiresAt={invitation.expiresAt}
      invitedEmail={invitation.invitedEmail}
      userEmail={user.email}
    />
  );
}

function InviteResult({ icon, title, message }: { icon: "success" | "error"; title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm rounded-2xl border bg-card shadow-lg p-8 text-center space-y-4">
        <div className="flex justify-center">
          {icon === "success" ? (
            <CheckCircle2 className="size-14 text-green-500" />
          ) : (
            <XCircle className="size-14 text-destructive" />
          )}
        </div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Building2 className="size-4" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
