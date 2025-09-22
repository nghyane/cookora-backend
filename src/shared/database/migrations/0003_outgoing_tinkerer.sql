CREATE TYPE "public"."media_category" AS ENUM('avatar', 'recipe', 'ingredient', 'community', 'news', 'tutorial');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'video', 'document');--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"key" text NOT NULL,
	"category" "media_category" NOT NULL,
	"type" "media_type" NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_slug_unique";--> statement-breakpoint
DROP INDEX "posts_slug_idx";--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_category_idx" ON "media" USING btree ("category");--> statement-breakpoint
CREATE INDEX "media_user_id_idx" ON "media" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "media_key_idx" ON "media" USING btree ("key");--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "slug";