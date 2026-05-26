CREATE TYPE delete_status AS ENUM ('SOFT_DELETED', 'SCHEDULED_DELETE', 'PERMANENTLY_DELETED', 'DELETE_FAILED');
--> statement-breakpoint
CREATE TABLE "soft_delete_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"deleted_by_user_id" text NOT NULL,
	"status" delete_status NOT NULL DEFAULT 'SOFT_DELETED',
	"scheduled_permanent_delete_at" timestamp with time zone NOT NULL,
	"attempted_delete_at" timestamp with time zone,
	"permanent_delete_at" timestamp with time zone,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "soft_delete_queue_scheduled_delete_idx" ON "soft_delete_queue" ("scheduled_permanent_delete_at");
--> statement-breakpoint
CREATE INDEX "soft_delete_queue_status_idx" ON "soft_delete_queue" ("status");
--> statement-breakpoint
CREATE INDEX "soft_delete_queue_transaction_id_idx" ON "soft_delete_queue" ("transaction_id");
--> statement-breakpoint
ALTER TABLE "soft_delete_queue" ADD CONSTRAINT "soft_delete_queue_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "soft_delete_queue" ADD CONSTRAINT "soft_delete_queue_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
