-- Add unique constraint on (property_id, invited_email) for property_invitations
-- This allows upserts to work properly when resending invitations
ALTER TABLE "property_invitations" ADD CONSTRAINT "property_invitations_property_id_invited_email_key" UNIQUE ("property_id", "invited_email");
