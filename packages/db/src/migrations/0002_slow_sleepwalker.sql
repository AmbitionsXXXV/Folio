ALTER TABLE "user" ADD COLUMN "no" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_no_unique" UNIQUE("no");