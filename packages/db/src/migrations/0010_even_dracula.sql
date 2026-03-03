ALTER TABLE "attachments" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "description_model" text;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "description_generated_at" timestamp with time zone;