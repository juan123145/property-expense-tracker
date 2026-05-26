ALTER TABLE "users"
	ADD COLUMN "username" text,
	ADD COLUMN "phone" text,
	ADD COLUMN "onboarding_complete" boolean DEFAULT false;

CREATE UNIQUE INDEX "users_username_unique" ON "users" ("username");
