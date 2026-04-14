CREATE TYPE "public"."service_status" AS ENUM('pending', 'active', 'suspended', 'canceled');--> statement-breakpoint
ALTER TYPE "public"."billing_interval" ADD VALUE 'hourly' BEFORE 'month';--> statement-breakpoint
ALTER TYPE "public"."billing_type" ADD VALUE 'metered';--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_reference_id" varchar(255),
	"status" "service_status" DEFAULT 'pending' NOT NULL,
	"monthly_price" varchar(50) DEFAULT '0' NOT NULL,
	"hourly_price" varchar(50) DEFAULT '0' NOT NULL,
	"plugin_data" jsonb,
	"last_billed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "balance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"type" varchar(50) NOT NULL,
	"reference_id" varchar(255),
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "subscriptions" CASCADE;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "account_balance" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_logs" ADD CONSTRAINT "balance_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "services_tenant_idx" ON "services" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "balance_logs_tenant_idx" ON "balance_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "balance_logs_type_idx" ON "balance_logs" USING btree ("type");--> statement-breakpoint
DROP TYPE "public"."subscription_status";