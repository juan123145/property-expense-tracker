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
    <div className="space-y-10">
      <SharePropertyModal
        propertyId={propertyId}
        propertyName="Property"
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
      />

      {/* Add Collaborator Button */}
      <div className="flex justify-end pr-4">
        <Button
          onClick={() => setShareModalOpen(true)}
          className="gap-2 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-shadow"
          size="lg"
        >
          <Plus className="size-5" />
          Add Collaborator
        </Button>
      </div>

      {/* Active Members */}
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Users2 className="size-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Active Members</h2>
              <span className="text-sm text-muted-foreground ml-0.5">({activeMembers.length})</span>
            </div>
          </div>
          <p className="text-base text-muted-foreground ml-9">Manage who has access to this property and their permissions</p>
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
          <div className="space-y-4">
            {activeMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-lg border bg-gradient-to-br from-card to-card/50 p-5 hover:shadow-md transition-all hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary shrink-0 border border-primary/20">
                        {(member.name || member.email)?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-base">{member.name || member.email}</p>
                        {member.name && (
                          <p className="text-sm text-muted-foreground truncate">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>
                    {member.joinedAt && (
                      <p className="text-xs text-muted-foreground mt-3 ml-13" suppressHydrationWarning>
                        Joined {formatDistanceToNow(member.joinedAt, { addSuffix: true })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="flex flex-col gap-4 items-end">
                    {member.role === "OWNER" ? (
                      // Owner: show badge, no controls
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="default" className="bg-green-600 text-white px-3 py-1 text-xs font-semibold">
                          Owner
                        </Badge>
                        <span className="text-xs text-muted-foreground">Full access & control</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 w-full max-w-xs">
                        {member.role && (
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Access Level</label>
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
                              <SelectTrigger className="w-full h-10 bg-muted/50 border border-primary/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EDITOR">
                                  <span className="font-medium">Editor</span> — Can edit & view
                                </SelectItem>
                                <SelectItem value="VIEWER">
                                  <span className="font-medium">Viewer</span> — Read only access
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/20">
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
                            className="rounded border-2 mt-0.5 cursor-pointer"
                          />
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-foreground">Can Share</span>
                            <span className="text-xs text-muted-foreground">Allow this member to invite others</span>
                          </div>
                        </label>
                      </div>
                    )}
                    </div>

                    {member.role !== "OWNER" && (
                      <AlertDialog>
                        <button
                          onClick={() => handleRevoke(member.id)}
                          disabled={revoking === member.id}
                          className="text-destructive hover:bg-destructive/10 p-2 rounded transition-colors disabled:opacity-50"
                          title="Revoke access"
                        >
                          <Trash2 className="size-5" />
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
                    )}
                  </div>
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
                  <p className="text-xs text-muted-foreground mt-2" suppressHydrationWarning>
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
                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
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
                        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
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
