-- Add uploader tracking to transaction_attachments table
-- uploaded_by_user_id: tracks which user uploaded the attachment

ALTER TABLE "transaction_attachments" ADD COLUMN "uploaded_by_user_id" text;
--> statement-breakpoint
-- Add foreign key constraint for uploaded_by_user_id
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
