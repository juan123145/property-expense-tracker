CREATE TYPE property_role AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
--> statement-breakpoint
CREATE TYPE membership_status AS ENUM ('ACTIVE', 'PENDING', 'REVOKED');
--> statement-breakpoint
CREATE TABLE "property_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" property_role NOT NULL,
	"can_share" boolean DEFAULT false,
	"status" membership_status DEFAULT 'ACTIVE',
	"created_at" timestamp with time zone DEFAULT now(),
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "property_memberships_property_user_unique" ON "property_memberships" ("property_id", "user_id");
--> statement-breakpoint
ALTER TABLE "property_memberships" ADD CONSTRAINT "property_memberships_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "property_memberships" ADD CONSTRAINT "property_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
