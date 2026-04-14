CREATE TABLE "app_settings" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"billing_entity" varchar(255),
	"billing_address" text,
	"billing_tax_id" varchar(100),
	"billing_email" varchar(255),
	"billing_country" varchar(2),
	"logo_url" text,
	"primary_color" varchar(7),
	"secondary_color" varchar(7),
	"custom_css" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
