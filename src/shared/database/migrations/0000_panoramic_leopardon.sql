CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "auth_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_data" jsonb,
	"password_hash" text,
	"verification_token" text,
	"verification_expires" timestamp,
	"reset_token" text,
	"reset_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unq_auth_providers_provider_id" UNIQUE("provider","provider_id")
);
--> statement-breakpoint
CREATE TABLE "pantry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"recipe_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"notes" text,
	CONSTRAINT "recipe_ingredients_recipe_id_ingredient_id_pk" PRIMARY KEY("recipe_id","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_instructions" (
	"recipe_id" uuid NOT NULL,
	"step" integer NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "recipe_instructions_recipe_id_step_pk" PRIMARY KEY("recipe_id","step")
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text,
	"servings" integer DEFAULT 4 NOT NULL,
	"cooking_time" integer NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ingredients_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "image_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash" text NOT NULL,
	"file_path" text NOT NULL,
	"original_name" text,
	"mime_type" text,
	"size" integer,
	"detected_ingredients" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "image_cache_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_instructions" ADD CONSTRAINT "recipe_instructions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auth_providers_user_id" ON "auth_providers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_auth_providers_provider" ON "auth_providers" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "idx_auth_providers_verification_token" ON "auth_providers" USING btree ("verification_token");--> statement-breakpoint
CREATE INDEX "idx_auth_providers_reset_token" ON "auth_providers" USING btree ("reset_token");--> statement-breakpoint
CREATE INDEX "idx_pantry_items_user_id" ON "pantry_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_pantry_items_ingredient_id" ON "pantry_items" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "idx_pantry_items_expires_at" ON "pantry_items" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_pantry_items_user_ingredient" ON "pantry_items" USING btree ("user_id","ingredient_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_token" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "recipes_title_idx" ON "recipes" USING btree ("title");--> statement-breakpoint
CREATE INDEX "recipes_created_at_idx" ON "recipes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "recipes_author_id_idx" ON "recipes" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "ingredients_name_idx" ON "ingredients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ingredients_category_idx" ON "ingredients" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ingredients_aliases_idx" ON "ingredients" USING gin ("aliases");--> statement-breakpoint
CREATE INDEX "image_cache_hash_idx" ON "image_cache" USING btree ("hash");