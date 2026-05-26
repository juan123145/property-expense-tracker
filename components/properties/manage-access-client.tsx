"use client";

import { useState } from "react";
import {
  revokeAccess,
  updateMembershipRole,
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
import { Trash2, Copy, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
};

type Props = {
  propertyId: string;
  members: Member[];
  invitations: Invitation[];
};

export function ManageAccessClient({
  propertyId,
  members,
  invitations,
}: Props) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Active Members */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Active Members ({activeMembers.length})</h2>
          <p className="text-sm text-muted-foreground">Users with current access to this property</p>
        </div>

        {activeMembers.length === 0 ? (
          <div className="rounded-lg border bg-muted/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">No active members yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4"
              >
                <div className="flex-1">
                  <p className="font-medium">{member.name || member.email}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  {member.joinedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {formatDistanceToNow(member.joinedAt, { addSuffix: true })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
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
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <label className="flex items-center gap-2 text-sm">
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
                      className="rounded"
                    />
                    Can Share
                  </label>

                  <AlertDialog>
                    <button
                      onClick={() => handleRevoke(member.id)}
                      disabled={revoking === member.id}
                      className="text-destructive hover:bg-destructive/10 p-2 rounded"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <AlertDialogContent>
                      <AlertDialogTitle>Revoke Access</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure? {member.name || member.email} will no longer have access to this property.
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
        <div>
          <h2 className="text-xl font-semibold">Pending Invitations ({pendingInvitations.length})</h2>
          <p className="text-sm text-muted-foreground">Awaiting user acceptance</p>
        </div>

        {pendingInvitations.length === 0 ? (
          <div className="rounded-lg border bg-muted/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">No pending invitations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingInvitations.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-lg border bg-yellow-50 p-4"
              >
                <div className="flex-1">
                  <p className="font-medium">{invite.email}</p>
                  {invite.createdAt && (
                    <p className="text-sm text-muted-foreground">
                      Invited {formatDistanceToNow(invite.createdAt, { addSuffix: true })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Expires {formatDistanceToNow(invite.expiresAt, { addSuffix: true })}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="secondary">{invite.role}</Badge>
                  {invite.canShare && <Badge variant="outline">Can Share</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">History & Revoked Access</h2>
          <p className="text-sm text-muted-foreground">Past invitations and removed members</p>
        </div>

        <div className="space-y-4">
          {revokedMembers.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Revoked Members ({revokedMembers.length})</h3>
              {revokedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border bg-red-50 p-4 text-sm"
                >
                  <div>
                    <p className="font-medium">{member.name || member.email}</p>
                    {member.revokedAt && (
                      <p className="text-xs text-muted-foreground">
                        Revoked {formatDistanceToNow(member.revokedAt, { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <Badge variant="destructive">{member.role}</Badge>
                </div>
              ))}
            </div>
          )}

          {declinedInvitations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Declined Invitations ({declinedInvitations.length})</h3>
              {declinedInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/50 p-4 text-sm"
                >
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">Declined</p>
                  </div>
                  <Badge variant="outline">{invite.role}</Badge>
                </div>
              ))}
            </div>
          )}

          {expiredInvitations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Expired Invitations ({expiredInvitations.length})</h3>
              {expiredInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/50 p-4 text-sm"
                >
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expired {formatDistanceToNow(invite.expiresAt, { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline">{invite.role}</Badge>
                </div>
              ))}
            </div>
          )}

          {revokedMembers.length === 0 &&
            declinedInvitations.length === 0 &&
            expiredInvitations.length === 0 && (
              <div className="rounded-lg border bg-muted/50 p-6 text-center">
                <p className="text-sm text-muted-foreground">No history yet</p>
              </div>
            )}
        </div>
      </section>
    </div>
  );
}
