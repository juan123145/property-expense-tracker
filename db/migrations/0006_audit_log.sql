CREATE TYPE audit_action AS ENUM (
	'PROPERTY_CREATED',
	'PROPERTY_UPDATED',
	'PROPERTY_DELETED',
	'TRANSACTION_CREATED',
	'TRANSACTION_UPDATED',
	'TRANSACTION_DELETED',
	'TRANSACTION_RESTORED',
	'MEMBERSHIP_ADDED',
	'MEMBERSHIP_ROLE_CHANGED',
	'MEMBERSHIP_REVOKED',
	'INVITATION_CREATED',
	'INVITATION_ACCEPTED',
	'INVITATION_DECLINED',
	'INVITATION_CANCELED',
	'ATTACHMENT_UPLOADED',
	'ATTACHMENT_DELETED'
);
--> statement-breakpoint
CREATE TABLE "property_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"action" audit_action NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"changes" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "property_audit_logs_property_id_idx" ON "property_audit_logs" ("property_id");
--> statement-breakpoint
CREATE INDEX "property_audit_logs_user_id_idx" ON "property_audit_logs" ("user_id");
--> statement-breakpoint
CREATE INDEX "property_audit_logs_created_at_idx" ON "property_audit_logs" ("created_at");
--> statement-breakpoint
CREATE INDEX "property_audit_logs_action_idx" ON "property_audit_logs" ("action");
--> statement-breakpoint
ALTER TABLE "property_audit_logs" ADD CONSTRAINT "property_audit_logs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "property_audit_logs" ADD CONSTRAINT "property_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
