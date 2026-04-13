ALTER TABLE "users" ADD COLUMN "first_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "setup_fee" numeric(12, 2) DEFAULT '0';