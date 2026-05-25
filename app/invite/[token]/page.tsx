import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { propertyShares, properties } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { acceptInvite } from "@/app/actions/shares";
import { Building2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const user = await requireAuth();

  // Look up the invite
  const [share] = await db
    .select({
      id: propertyShares.id,
      status: propertyShares.status,
      permission: propertyShares.permission,
      invitedEmail: propertyShares.invitedEmail,
      ownerId: propertyShares.ownerId,
      propertyId: propertyShares.propertyId,
      propertyName: properties.name,
    })
    .from(propertyShares)
    .innerJoin(properties, eq(propertyShares.propertyId, properties.id))
    .where(eq(propertyShares.inviteToken, token))
    .limit(1);

  if (!share) {
    return <InviteResult icon="error" title="Invitation not found" message="This link is invalid or has expired." />;
  }

  if (share.status === "accepted") {
    redirect(`/properties/${share.propertyId}`);
  }

  if (share.status === "revoked") {
    return <InviteResult icon="error" title="Invitation revoked" message="This invitation has been revoked by the property owner." />;
  }

  if (share.ownerId === user.id) {
    return <InviteResult icon="error" title="This is your own property" message="You cannot accept an invitation to your own property." />;
  }

  // Auto-accept
  const result = await acceptInvite(token);
  if (result.error) {
    return <InviteResult icon="error" title="Could not accept invitation" message={result.error} />;
  }

  redirect(`/properties/${result.propertyId}`);
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
