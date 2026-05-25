CREATE TABLE "transaction_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"url" text NOT NULL,
	"name" text,
	"size_kb" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "transaction_attachments" ("transaction_id", "url", "name", "size_kb", "position")
SELECT "id", "attachment_url", "attachment_name", "attachment_size_kb", 0
FROM "transactions"
WHERE "attachment_url" IS NOT NULL;
