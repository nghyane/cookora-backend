CREATE TABLE "pantry_followers" (
	"pantry_owner_id" uuid NOT NULL,
	"follower_id" uuid NOT NULL,
	"followed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unq_pantry_followers" UNIQUE("pantry_owner_id","follower_id")
);
--> statement-breakpoint
ALTER TABLE "pantry_items" ADD COLUMN "added_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pantry_invite_code" text;--> statement-breakpoint
ALTER TABLE "pantry_followers" ADD CONSTRAINT "pantry_followers_pantry_owner_id_users_id_fk" FOREIGN KEY ("pantry_owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_followers" ADD CONSTRAINT "pantry_followers_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pantry_followers_owner" ON "pantry_followers" USING btree ("pantry_owner_id");--> statement-breakpoint
CREATE INDEX "idx_pantry_followers_follower" ON "pantry_followers" USING btree ("follower_id");--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pantry_items_added_by" ON "pantry_items" USING btree ("added_by");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_pantry_invite_code_unique" UNIQUE("pantry_invite_code");