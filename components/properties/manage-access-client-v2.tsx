"use client";

import { useState } from "react";
import {
  revokeAccess,
  updateMembershipRole,
  cancelInvitation,
  reinstateAccess,
} from "@/app/actions/shares";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SharePropertyModal } from "./share-property-modal";
import {
  Trash2,
  Users2,
  Plus,
  Clock,
  CheckCircle2,
  Shield,
  AlertCircle,
  Copy,
  RotateCcw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://property-expense-tracker.vercel.app";

type Member = {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  role: string;
  canShare: boolean | null;
  joinedAt: Date | null;
  status: string | null;
  revokedAt: Date | null;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  canShare: boolean | null;
  status: string;
  createdAt: Date | null;
  expiresAt: Date;
  token?: string;
};

type Props = {
  propertyId: string;
  members: Member[];
  invitations: Invitation[];
};

export function ManageAccessClientV2({
  propertyId,
  members,
  invitations,
}: Props) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [reinstating, setReinstating] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const activeMembers = members.filter((m) => m.status === "ACTIVE");
  const revokedMembers = members.filter((m) => m.status === "REVOKED");
  const pendingInvitations = invitations.filter((i) => i.status === "PENDING");
  const declinedInvitations = invitations.filter((i) => i.status === "DECLINED");
  const expiredInvitations = invitations.filter((i) => i.status === "EXPIRED");

  const handleRevoke = async (membershipId: string) => {
    setRevoking(membershipId);
    try {
      const result = await revokeAccess(membershipId);
      if (result.error) {
        alert(result.error);
      }
    } catch (err) {
      alert("Failed to revoke access");
    } finally {
      setRevoking(null);
    }
  };

  const handleRoleChange = async (
    membershipId: string,
    newRole: string,
    canShare: boolean
  ) => {
    setUpdating(membershipId);
    try {
      const result = await updateMembershipRole(
        membershipId,
        newRole as "EDITOR" | "VIEWER",
        canShare
      );
      if (result.error) {
        alert(result.error);
      }
    } catch (err) {
      alert("Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setCanceling(invitationId);
    try {
      const result = await cancelInvitation(invitationId);
      if (result.error) {
        alert(result.error);
      }
    } catch (err) {
      alert("Failed to cancel invitation");
    } finally {
      setCanceling(null);
    }
  };

  const handleReinstateAccess = async (membershipId: string, role: string) => {
    setReinstating(membershipId);
    try {
      const result = await reinstateAccess(membershipId, role as "EDITOR" | "VIEWER");
      if (result.error) {
        alert(result.error);
      }
    } catch (err) {
      alert("Failed to reinstate access");
    } finally {
      setReinstating(null);
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${APP_URL}/invite/${token}`;
    navigator.clipboard.writeText(url);
    alert("Invitation link copied to clipboard!");
  };

  return (
    <div className="space-y-8">
      <SharePropertyModal
        propertyId={propertyId}
        propertyName="Property"
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
      />

      {/* Header with Add Collaborator Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Access</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control who has access to this property and what they can do
          </p>
        </div>
        <Button
          onClick={() => setShareModalOpen(true)}
          className="gap-2"
          size="lg"
        >
          <Plus className="size-4" />
          Add Collaborator
        </Button>
      </div>

      {/* Active Members */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users2 className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Active Members ({activeMembers.length})</h2>
        </div>

        {activeMembers.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
            <Users2 className="size-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No active members yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first collaborator to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary shrink-0">
                      {(member.name || member.email)?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{member.name || member.email}</p>
                      {member.name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {member.email}
                        </p>
                      )}
                    </div>
                  </div>
                  {member.joinedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Joined {formatDistanceToNow(member.joinedAt, { addSuffix: true })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {member.role && (
                    <Select
                      value={member.role}
                      onValueChange={(role) =>
                        handleRoleChange(
                          member.id,
                          role as "EDITOR" | "VIEWER",
                          member.canShare ?? false
                        )
                      }
                      disabled={updating === member.id}
                    >
                      <SelectTrigger className="w-24 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={member.canShare ?? false}
                      onChange={(e) =>
                        handleRoleChange(
                          member.id,
                          (member.role ?? "VIEWER") as "EDITOR" | "VIEWER",
                          e.target.checked
                        )
                      }
                      disabled={updating === member.id}
                      className="rounded border"
                      title="Allow this member to share with others"
                    />
                  </label>

                  <AlertDialog>
                    <button
                      onClick={() => handleRevoke(member.id)}
                      disabled={revoking === member.id}
                      className="text-destructive hover:bg-destructive/10 p-2 rounded transition-colors disabled:opacity-50"
                      title="Revoke access"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <AlertDialogContent>
                      <AlertDialogTitle>Revoke Access</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure? {member.name || member.email} will immediately lose
                        access to this property.
                      </AlertDialogDescription>
                      <div className="flex justify-end gap-2">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRevoke(member.id)}
                          className="bg-destructive"
                        >
                          Revoke
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Invitations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-amber-600" />
          <h2 className="text-lg font-semibold">Pending Invitations ({pendingInvitations.length})</h2>
        </div>

        {pendingInvitations.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
            <Clock className="size-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No pending invitations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingInvitations.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{invite.email}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <Badge variant="secondary">{invite.role}</Badge>
                    {invite.canShare && (
                      <Badge variant="outline">Can Share</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {invite.createdAt && (
                      <>
                        Invited {formatDistanceToNow(invite.createdAt, { addSuffix: true })}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      Expires
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(invite.expiresAt, { addSuffix: true })}
                    </p>
                  </div>

                  {invite.token && (
                    <button
                      onClick={() => copyInviteLink(invite.token!)}
                      className="text-muted-foreground hover:bg-amber-100 dark:hover:bg-amber-900/30 p-2 rounded transition-colors"
                      title="Copy invitation link"
                    >
                      <Copy className="size-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleCancelInvitation(invite.id)}
                    disabled={canceling === invite.id}
                    className="text-destructive hover:bg-destructive/10 p-2 rounded transition-colors disabled:opacity-50"
                    title="Cancel invitation"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      {(revokedMembers.length > 0 ||
        declinedInvitations.length > 0 ||
        expiredInvitations.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">History</h2>
          </div>

          <div className="space-y-4">
            {revokedMembers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Revoked Members ({revokedMembers.length})
                </p>
                {revokedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border bg-red-50 dark:bg-red-950/20 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{member.name || member.email}</p>
                      {member.revokedAt && (
                        <p className="text-xs text-muted-foreground">
                          Revoked {formatDistanceToNow(member.revokedAt, { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="destructive">{member.role}</Badge>
                      <button
                        onClick={() => handleReinstateAccess(member.id, member.role)}
                        disabled={reinstating === member.id}
                        className="text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 p-2 rounded transition-colors disabled:opacity-50"
                        title="Reinstate access"
                      >
                        <RotateCcw className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {declinedInvitations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Declined Invitations ({declinedInvitations.length})
                </p>
                {declinedInvitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 text-sm"
                  >
                    <p className="font-medium">{invite.email}</p>
                    <Badge variant="outline">{invite.role}</Badge>
                  </div>
                ))}
              </div>
            )}

            {expiredInvitations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Expired Invitations ({expiredInvitations.length})
                </p>
                {expiredInvitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 text-sm"
                  >
                    <p className="font-medium">{invite.email}</p>
                    <Badge variant="outline">{invite.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
