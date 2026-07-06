CREATE TABLE "entry_collaborators" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"invited_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entry_sync_state" (
	"entry_id" text PRIMARY KEY NOT NULL,
	"ydoc_state" bytea NOT NULL,
	"content_hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entry_collaborators" ADD CONSTRAINT "entry_collaborators_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_collaborators" ADD CONSTRAINT "entry_collaborators_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_collaborators" ADD CONSTRAINT "entry_collaborators_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_sync_state" ADD CONSTRAINT "entry_sync_state_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_collaborators_entry_id_idx" ON "entry_collaborators" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "entry_collaborators_user_id_idx" ON "entry_collaborators" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_collaborators_entry_id_user_id_idx" ON "entry_collaborators" USING btree ("entry_id","user_id");