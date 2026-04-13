CREATE TABLE "tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"tax_rate" numeric(5, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_rates_tenant_country_idx" UNIQUE("tenant_id","country_code")
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_method" varchar(255);--> statement-breakpoint
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tax_rates_country_idx" ON "tax_rates" USING btree ("country_code");