import { db } from "@/db";
import { propertyMemberships, propertyInvitations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Property role for RBAC
 */
export type PropertyRole = "OWNER" | "EDITOR" | "VIEWER";

/**
 * Property membership data structure
 */
export interface PropertyMembership {
  userId: string;
  role: PropertyRole;
  canShare: boolean | null;
  status: "ACTIVE" | "PENDING" | "REVOKED";
}

/**
 * Property invitation data structure
 */
export interface PropertyInvitation {
  id: string;
  propertyId: string;
  invitedEmail: string;
  role: PropertyRole;
  canShare: boolean | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELED";
}

/**
 * Role hierarchy for permission checks
 */
const roleHierarchy: Record<PropertyRole, number> = {
  OWNER: 3,
  EDITOR: 2,
  VIEWER: 1,
};

/**
 * Get user's property membership details
 * @param userId - The user ID
 * @param propertyId - The property ID
 * @returns PropertyMembership or null if no membership exists
 */
export async function getUserPropertyRole(
  userId: string,
  propertyId: string
): Promise<PropertyMembership | null> {
  const [membership] = await db
    .select()
    .from(propertyMemberships)
    .where(
      and(
        eq(propertyMemberships.userId, userId),
        eq(propertyMemberships.propertyId, propertyId)
      )
    )
    .limit(1);

  if (!membership) return null;

  return {
    userId: membership.userId,
    role: membership.role as PropertyRole,
    canShare: membership.canShare,
    status: membership.status as "ACTIVE" | "PENDING" | "REVOKED",
  };
}

/**
 * Check if user can read a property
 * @param userId - The user ID
 * @param propertyId - The property ID
 * @returns true if user has an active membership
 */
export async function canReadProperty(
  userId: string,
  propertyId: string
): Promise<boolean> {
  const membership = await getUserPropertyRole(userId, propertyId);
  return membership !== null && membership.status === "ACTIVE";
}

/**
 * Check if user can write to a property
 * @param userId - The user ID
 * @param propertyId - The property ID
 * @returns true if user is OWNER or EDITOR with active status
 */
export async function canWriteToProperty(
  userId: string,
  propertyId: string
): Promise<boolean> {
  const membership = await getUserPropertyRole(userId, propertyId);
  if (!membership || membership.status !== "ACTIVE") return false;

  return membership.role === "OWNER" || membership.role === "EDITOR";
}

/**
 * Check if user can manage a property
 * @param userId - The user ID
 * @param propertyId - The property ID
 * @returns true if user is OWNER with active status
 */
export async function canManageProperty(
  userId: string,
  propertyId: string
): Promise<boolean> {
  const membership = await getUserPropertyRole(userId, propertyId);
  if (!membership || membership.status !== "ACTIVE") return false;

  return membership.role === "OWNER";
}

/**
 * Check if user can share a property
 * @param userId - The user ID
 * @param propertyId - The property ID
 * @returns true if user has canShare permission or is OWNER, and status is ACTIVE
 */
export async function canShareProperty(
  userId: string,
  propertyId: string
): Promise<boolean> {
  const membership = await getUserPropertyRole(userId, propertyId);
  if (!membership || membership.status !== "ACTIVE") return false;

  // OWNER can always share
  if (membership.role === "OWNER") return true;

  // EDITOR or VIEWER can share only if canShare is true
  return membership.canShare === true;
}

/**
 * Check if user can grant a specific role to another user
 * @param userId - The user ID
 * @param propertyId - The property ID
 * @param targetRole - The role to be granted
 * @returns true if user has permission to grant that role
 */
export async function canGrantRole(
  userId: string,
  propertyId: string,
  targetRole: PropertyRole
): Promise<boolean> {
  const membership = await getUserPropertyRole(userId, propertyId);
  if (!membership || membership.status !== "ACTIVE") return false;

  // Must have canShare permission to grant roles (unless OWNER)
  if (membership.role !== "OWNER" && membership.canShare !== true) return false;

  // Get role hierarchy levels
  const userRoleLevel = roleHierarchy[membership.role];
  const targetRoleLevel = roleHierarchy[targetRole];

  // User can only grant roles at or below their level
  return userRoleLevel >= targetRoleLevel;
}

/**
 * Get all active members of a property
 * @param propertyId - The property ID
 * @returns Array of active property members
 */
export async function getPropertyMembers(propertyId: string): Promise<PropertyMembership[]> {
  const members = await db
    .select()
    .from(propertyMemberships)
    .where(
      and(
        eq(propertyMemberships.propertyId, propertyId),
        eq(propertyMemberships.status, "ACTIVE")
      )
    );

  return members.map((member) => ({
    userId: member.userId,
    role: member.role as PropertyRole,
    canShare: member.canShare,
    status: "ACTIVE" as const,
  }));
}

/**
 * Get all pending invitations for a property
 * @param propertyId - The property ID
 * @returns Array of pending property invitations
 */
export async function getPropertyInvitations(
  propertyId: string
): Promise<PropertyInvitation[]> {
  const invitations = await db
    .select()
    .from(propertyInvitations)
    .where(
      and(
        eq(propertyInvitations.propertyId, propertyId),
        eq(propertyInvitations.status, "PENDING")
      )
    );

  return invitations.map((invitation) => ({
    id: invitation.id,
    propertyId: invitation.propertyId,
    invitedEmail: invitation.invitedEmail,
    role: invitation.role as PropertyRole,
    canShare: invitation.canShare,
    status: "PENDING" as const,
  }));
}
