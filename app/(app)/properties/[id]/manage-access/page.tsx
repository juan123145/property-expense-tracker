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
    <div className="space-y-6 pb-8">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link href={`/properties/${id}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="size-4" />
            Back
          </Button>
        </Link>
      </div>

      <ManageAccessClientV2
        propertyId={id}
        members={members}
        invitations={invitations}
      />
    </div>
  );
}
