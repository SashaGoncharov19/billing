ALTER TABLE "users" ADD COLUMN "billing_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_tax_id" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_email" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_country" varchar(2);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_entity" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_address" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_tax_id" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_email" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_country" varchar(2);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "issuer_details" jsonb;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "recipient_details" jsonb;