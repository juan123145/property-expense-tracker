-- Create enums for property membership RBAC
CREATE TYPE property_role AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE membership_status AS ENUM ('ACTIVE', 'PENDING', 'REVOKED');

-- Create property_memberships table
CREATE TABLE "property_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"property_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" property_role NOT NULL,
	"can_share" boolean DEFAULT false,
	"status" membership_status DEFAULT 'ACTIVE',
	"created_at" timestamp with time zone DEFAULT now(),
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE cascade,
	FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE cascade
);

-- Create unique index on (property_id, user_id)
CREATE UNIQUE INDEX "property_memberships_property_user_unique" ON "property_memberships" ("property_id", "user_id");
