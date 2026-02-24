CREATE TABLE "entry_links" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_entry_id" text NOT NULL,
	"target_entry_id" text NOT NULL,
	"link_type" text DEFAULT 'ref' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entry_links" ADD CONSTRAINT "entry_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_links" ADD CONSTRAINT "entry_links_source_entry_id_entries_id_fk" FOREIGN KEY ("source_entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_links" ADD CONSTRAINT "entry_links_target_entry_id_entries_id_fk" FOREIGN KEY ("target_entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_links_source_idx" ON "entry_links" USING btree ("source_entry_id");--> statement-breakpoint
CREATE INDEX "entry_links_target_idx" ON "entry_links" USING btree ("target_entry_id");--> statement-breakpoint
CREATE INDEX "entry_links_user_idx" ON "entry_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_links_source_target_type_idx" ON "entry_links" USING btree ("source_entry_id","target_entry_id","link_type");