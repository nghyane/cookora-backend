ALTER TYPE "public"."user_role" ADD VALUE 'staff' BEFORE 'admin';--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "width";--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "height";--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "updated_at";