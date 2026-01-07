CREATE TABLE "entry_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"user_id" text NOT NULL,
	"share_token" text NOT NULL,
	"password_hash" text,
	"expires_at" timestamp with time zone,
	"show_branding" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entry_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "entry_shares" ADD CONSTRAINT "entry_shares_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_shares" ADD CONSTRAINT "entry_shares_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_shares_entry_id_idx" ON "entry_shares" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "entry_shares_user_id_idx" ON "entry_shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entry_shares_share_token_idx" ON "entry_shares" USING btree ("share_token");