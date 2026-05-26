CREATE TABLE "storage_ownerships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attachment_url" text NOT NULL,
	"property_id" uuid,
	"owner_id" text NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"content_type" text,
	"file_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "storage_ownerships" ADD CONSTRAINT "storage_ownerships_attachment_url_unique" UNIQUE("attachment_url");
--> statement-breakpoint
ALTER TABLE "storage_ownerships" ADD CONSTRAINT "storage_ownerships_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "storage_ownerships" ADD CONSTRAINT "storage_ownerships_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "storage_ownerships" ADD CONSTRAINT "storage_ownerships_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "storage_ownerships_owner_id_idx" ON "storage_ownerships" ("owner_id");
--> statement-breakpoint
CREATE INDEX "storage_ownerships_property_id_idx" ON "storage_ownerships" ("property_id");
--> statement-breakpoint
CREATE INDEX "storage_ownerships_created_at_idx" ON "storage_ownerships" ("created_at");
--> statement-breakpoint
CREATE INDEX "storage_ownerships_deleted_at_idx" ON "storage_ownerships" ("deleted_at");
