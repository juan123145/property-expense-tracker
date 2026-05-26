import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { properties, propertyMemberships, propertyInvitations, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManageAccessClientV2 } from "@/components/properties/manage-access-client-v2";

async function getProperty(id: string, userId: string) {
  const [property] = await db
    .select({
      id: properties.id,
      name: properties.name,
      ownerId: properties.ownerId,
      userId: properties.userId,
    })
    .from(properties)
    .where(eq(properties.id, id))
    .limit(1);

  return property ?? null;
}

async function getPropertyMembers(propertyId: string) {
  return db
    .select({
      id: propertyMemberships.id,
      userId: propertyMemberships.userId,
      email: users.email,
      name: users.name,
      role: propertyMemberships.role,
      canShare: propertyMemberships.canShare,
      joinedAt: propertyMemberships.createdAt,
      status: propertyMemberships.status,
      revokedAt: propertyMemberships.revokedAt,
    })
    .from(propertyMemberships)
    .innerJoin(users, eq(propertyMemberships.userId, users.id))
    .where(eq(propertyMemberships.propertyId, propertyId));
}

async function getPropertyInvitations(propertyId: string) {
  return db
    .select({
      id: propertyInvitations.id,
      email: propertyInvitations.invitedEmail,
      role: propertyInvitations.role,
      canShare: propertyInvitations.canShare,
      status: propertyInvitations.status,
      createdAt: propertyInvitations.createdAt,
      expiresAt: propertyInvitations.expiresAt,
      token: propertyInvitations.token,
    })
    .from(propertyInvitations)
    .where(eq(propertyInvitations.propertyId, propertyId));
}

type PageProps = { params: Promise<{ id: string }> };

export default async function ManageAccessPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();

  const property = await getProperty(id, user.id);
  if (!property) notFound();

  // Only owner can manage access
  const isOwner = property.userId === user.id || property.ownerId === user.id;
  if (!isOwner) notFound();

  const [members, invitations] = await Promise.all([
    getPropertyMembers(id),
    getPropertyInvitations(id),
  ]);

  return (
    <div className="space-y-8 pb-16 px-6 md:px-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4 pt-6">
        <Link href={`/properties/${id}`}>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 bg-background hover:bg-accent border-2 hover:border-primary/50 transition-all"
          >
            <ChevronLeft className="size-5" />
            <span className="font-semibold">Back to {property.name}</span>
          </Button>
        </Link>
      </div>

      {/* Page title and description */}
      <div className="space-y-3 border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Manage Access</h1>
          <p className="text-lg text-muted-foreground mt-2">Control who can access and collaborate on this property</p>
        </div>
      </div>

      <ManageAccessClientV2
        propertyId={id}
        members={members}
        invitations={invitations}
      />
    </div>
  );
}
