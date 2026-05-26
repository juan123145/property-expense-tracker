-- Add deletion tracking columns to transactions table
-- deleted_by_user_id: tracks which user deleted the transaction
-- scheduled_permanent_delete_at: tracks when the transaction will be permanently deleted (30 days after soft delete)

ALTER TABLE "transactions" ADD COLUMN "deleted_by_user_id" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "scheduled_permanent_delete_at" timestamp with time zone;
--> statement-breakpoint
-- Add foreign key constraint for deleted_by_user_id
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Backfill scheduled_permanent_delete_at for existing soft-deleted transactions (30 days after deletion)
UPDATE "transactions" SET "scheduled_permanent_delete_at" = "deleted_at" + interval '30 days' WHERE "is_deleted" = true AND "deleted_at" IS NOT NULL;
