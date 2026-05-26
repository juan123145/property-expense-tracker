CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED');
--> statement-breakpoint
CREATE TABLE "property_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"invited_email" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"role" property_role NOT NULL,
	"can_share" boolean DEFAULT false,
	"status" invitation_status NOT NULL DEFAULT 'PENDING',
	"token" text NOT NULL,
	"token_used_by_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "property_invitations_property_id_idx" ON "property_invitations" ("property_id");
--> statement-breakpoint
CREATE INDEX "property_invitations_invited_email_idx" ON "property_invitations" ("invited_email");
--> statement-breakpoint
CREATE INDEX "property_invitations_token_idx" ON "property_invitations" ("token");
--> statement-breakpoint
CREATE INDEX "property_invitations_expires_at_idx" ON "property_invitations" ("expires_at");
--> statement-breakpoint
ALTER TABLE "property_invitations" ADD CONSTRAINT "property_invitations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "property_invitations" ADD CONSTRAINT "property_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "property_invitations" ADD CONSTRAINT "property_invitations_token_used_by_user_id_users_id_fk" FOREIGN KEY ("token_used_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
