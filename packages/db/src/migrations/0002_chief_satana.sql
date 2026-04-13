ALTER TABLE "products" ADD COLUMN "plugin_type" varchar(100);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "plugin_config" jsonb;