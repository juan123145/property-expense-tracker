-- Add owner_id, created_by_user_id, updated_at, and image_storage_owner_id columns to properties table
-- Note: user_id column kept for backwards compatibility, but deprecated. All queries should use owner_id instead

ALTER TABLE "properties" ADD COLUMN "owner_id" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "created_by_user_id" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "image_storage_owner_id" text;
--> statement-breakpoint
-- Backfill owner_id and created_by_user_id from user_id
UPDATE "properties" SET "owner_id" = "user_id", "created_by_user_id" = "user_id";
--> statement-breakpoint
-- Add foreign key constraints with CASCADE delete
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_image_storage_owner_id_users_id_fk" FOREIGN KEY ("image_storage_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
